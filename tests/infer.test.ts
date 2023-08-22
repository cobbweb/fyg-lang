import { test, expect } from "bun:test";
import { ConstDeclaration, NodeType, Identifier } from "../src/nodes";

function createBasicConst(
  name: string,
  value: string | boolean | number
): ConstDeclaration {
  const kind = typeof value as "string" | "boolean" | "number";
  return {
    type: NodeType.ConstDeclaration,
    typeAnnotation: {
      type: NodeType.TypeAnnotation,
      expression: { type: NodeType.InferenceRequired },
    },
    name: id(name),
    value: { type: NodeType.PrimitiveValue, kind, value },
  };
}

function id(name: string): Identifier {
  return { type: NodeType.Identifier, name };
}

test("inferencing a const with string value", () => {
  const constNode = createBasicConst("inferMyString", "hello inferencing!");
});
