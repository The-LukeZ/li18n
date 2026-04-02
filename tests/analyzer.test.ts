import { describe, test, expect } from "bun:test";
import { analyzeTree } from "../src/analyzer.ts";
import type { MessageNode, MessageTree, VarType } from "../src/types.ts";

function stringNode(vars: { name: string; type: VarType }[] = []): Extract<MessageNode, { kind: "string" }> {
  return { kind: "string" as const, template: "", vars };
}

function conditionalNode(
  condVar: string,
  condType: "boolean" | "string" | "number",
  cases: { key: string; value: string; vars?: string[] }[],
): Extract<MessageNode, { kind: "conditional" }> {
  return {
    kind: "conditional" as const,
    condVar,
    condType,
    cases: cases.map((c) => ({ key: c.key, value: c.value, vars: c.vars ?? [] })),
  };
}

describe("analyzeTree - string nodes", () => {
  test("passes string nodes through unchanged", () => {
    const tree: MessageTree = { greeting: stringNode() };
    const { tree: result, errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(0);
    expect(result["greeting"]).toEqual(stringNode());
  });

  test("passes string node with vars through unchanged", () => {
    const tree: MessageTree = { msg: stringNode([{ name: "name", type: "string" }, { name: "count", type: "string" }]) };
    const { tree: result, errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(0);
    expect(result["msg"]).toEqual(stringNode([{ name: "name", type: "string" }, { name: "count", type: "string" }]));
  });
});

describe("analyzeTree - boolean inference", () => {
  test("infers boolean condType when all non-else keys are true/false", () => {
    const tree: MessageTree = {
      role: conditionalNode("isAdmin", "string", [
        { key: "true", value: "Admin" },
        { key: "false", value: "User" },
      ]),
    };
    const { tree: result, errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(0);
    const node = result["role"]!;
    expect(node.kind).toBe("conditional");
    if (node.kind === "conditional") expect(node.condType).toBe("boolean");
  });

  test("preserves explicit boolean condType from parser", () => {
    const tree: MessageTree = {
      active: conditionalNode("active", "boolean", [
        { key: "true", value: "Yes" },
        { key: "false", value: "No" },
      ]),
    };
    const { tree: result, errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(0);
    const node = result["active"]!;
    if (node.kind === "conditional") expect(node.condType).toBe("boolean");
  });

  test("boolean inference works with only one of true/false (other is else)", () => {
    const tree: MessageTree = {
      flag: conditionalNode("flag", "string", [
        { key: "true", value: "Enabled" },
        { key: "else", value: "Disabled" },
      ]),
    };
    const { tree: result, errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(0);
    const node = result["flag"]!;
    if (node.kind === "conditional") expect(node.condType).toBe("boolean");
  });
});

describe("analyzeTree - number inference", () => {
  test("infers number condType from operator case keys", () => {
    const tree: MessageTree = {
      items: conditionalNode("count", "string", [
        { key: ">= 10", value: "many" },
        { key: "1", value: "one item" },
        { key: "else", value: "{count} items" },
      ]),
    };
    const { tree: result, errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(0);
    const node = result["items"]!;
    if (node.kind === "conditional") expect(node.condType).toBe("number");
  });

  test("infers number condType from bare number keys", () => {
    const tree: MessageTree = {
      score: conditionalNode("score", "string", [
        { key: "0", value: "zero" },
        { key: "100", value: "perfect" },
        { key: "else", value: "{score} points" },
      ]),
    };
    const { tree: result, errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(0);
    const node = result["score"]!;
    if (node.kind === "conditional") expect(node.condType).toBe("number");
  });

  test("infers number with all operator formats", () => {
    const tree: MessageTree = {
      n: conditionalNode("n", "string", [
        { key: "=== 0", value: "none" },
        { key: "!== 1", value: "not one" },
        { key: "> 100", value: "many" },
        { key: "else", value: "some" },
      ]),
    };
    const { tree: result, errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(0);
    const node = result["n"]!;
    if (node.kind === "conditional") expect(node.condType).toBe("number");
  });

  test("preserves explicit number condType from parser", () => {
    const tree: MessageTree = {
      count: conditionalNode("count", "number", [
        { key: "1", value: "one" },
        { key: "else", value: "{count} items" },
      ]),
    };
    const { tree: result, errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(0);
    const node = result["count"]!;
    if (node.kind === "conditional") expect(node.condType).toBe("number");
  });
});

describe("analyzeTree - string fallback", () => {
  test("falls back to string condType for arbitrary string keys", () => {
    const tree: MessageTree = {
      lang: conditionalNode("lang", "string", [
        { key: "en", value: "English" },
        { key: "de", value: "German" },
        { key: "else", value: "Other" },
      ]),
    };
    const { tree: result, errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(0);
    const node = result["lang"]!;
    if (node.kind === "conditional") expect(node.condType).toBe("string");
  });

  test("falls back to string when keys are mixed letter/operator", () => {
    const tree: MessageTree = {
      mixed: conditionalNode("x", "string", [
        { key: "admin", value: "Admin" },
        { key: "> 10", value: "over" },
      ]),
    };
    const { tree: result } = analyzeTree(tree, "en.json");
    const node = result["mixed"]!;
    if (node.kind === "conditional") expect(node.condType).toBe("string");
  });
});

describe("analyzeTree - variable collection", () => {
  test("allVars includes condVar", () => {
    const tree: MessageTree = {
      role: conditionalNode("isAdmin", "boolean", [
        { key: "true", value: "Admin" },
        { key: "false", value: "User" },
      ]),
    };
    const { tree: result } = analyzeTree(tree, "en.json");
    const node = result["role"]! as any;
    expect(node.allVars).toContain("isAdmin");
  });

  test("allVars includes vars from case values", () => {
    const tree: MessageTree = {
      msg: conditionalNode("isAdmin", "boolean", [
        { key: "true", value: "Hi {name}", vars: ["name"] },
        { key: "false", value: "Hello {user}", vars: ["user"] },
      ]),
    };
    const { tree: result } = analyzeTree(tree, "en.json");
    const node = result["msg"]! as any;
    expect(node.allVars).toContain("isAdmin");
    expect(node.allVars).toContain("name");
    expect(node.allVars).toContain("user");
  });

  test("allVars deduplicates repeated vars", () => {
    const tree: MessageTree = {
      msg: conditionalNode("x", "string", [
        { key: "a", value: "Hello {name}", vars: ["name"] },
        { key: "b", value: "Bye {name}", vars: ["name"] },
      ]),
    };
    const { tree: result } = analyzeTree(tree, "en.json");
    const node = result["msg"]! as any;
    const nameCount = (node.allVars as string[]).filter((v) => v === "name").length;
    expect(nameCount).toBe(1);
  });
});

describe("analyzeTree - validation errors", () => {
  test("errors on boolean conditional with invalid case key", () => {
    const tree: MessageTree = {
      flag: conditionalNode("flag", "boolean", [
        { key: "true", value: "Yes" },
        { key: "maybe", value: "Perhaps" },
      ]),
    };
    const { errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(1);
    expect(errors[0]!.key).toBe("flag");
    expect(errors[0]!.message).toContain("maybe");
  });

  test("errors on number conditional missing else case", () => {
    const tree: MessageTree = {
      count: conditionalNode("count", "number", [{ key: "1", value: "one" }]),
    };
    const { errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(1);
    expect(errors[0]!.key).toBe("count");
    expect(errors[0]!.message).toContain("else");
  });

  test("errors on number conditional with invalid case key", () => {
    const tree: MessageTree = {
      n: conditionalNode("n", "number", [
        { key: "not-a-number", value: "bad" },
        { key: "else", value: "ok" },
      ]),
    };
    const { errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(1);
    expect(errors[0]!.key).toBe("n");
    expect(errors[0]!.message).toContain("not-a-number");
  });

  test("keeps raw node in tree on error so processing continues", () => {
    const tree: MessageTree = {
      bad: conditionalNode("flag", "boolean", [{ key: "invalid", value: "x" }]),
      good: stringNode([{ name: "name", type: "string" }]),
    };
    const { tree: result, errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(1);
    expect(result["bad"]).toBeDefined();
    expect(result["good"]).toEqual(stringNode([{ name: "name", type: "string" }]));
  });

  test("accumulates multiple independent errors", () => {
    const tree: MessageTree = {
      a: conditionalNode("a", "number", [{ key: "1", value: "x" }]), // no else
      b: conditionalNode("b", "boolean", [{ key: "bad", value: "y" }]),
    };
    const { errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(2);
  });

  test("no errors for valid tree returns empty errors array", () => {
    const tree: MessageTree = {
      greeting: stringNode(),
      count: conditionalNode("count", "number", [
        { key: "1", value: "one" },
        { key: "else", value: "many" },
      ]),
    };
    const { errors } = analyzeTree(tree, "en.json");
    expect(errors).toHaveLength(0);
  });
});
