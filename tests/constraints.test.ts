import { test, expect } from "bun:test";
import { bindConstDeclaration, bindFunction } from "../src/binder";
import { createScope } from "../src/scope";
import {
  constDeclaration,
  basicFn,
  createBasicConst,
  id,
  inferenceRequired,
  number,
  numberType,
  param,
  typeAnnotation,
} from "./lib/astBuilders";
import {
  collectConstDeclaration,
  collectFunctionDefinition,
} from "../src/constraints";
import { FunctionExpression, NodeType } from "../src/nodes";
import { SetRequired } from "type-fest";

test("basic const declaration constraint collection", () => {
  const scope = createScope();
  const constNode = createBasicConst("foobar", "hello world!");

  bindConstDeclaration(constNode, scope);
  collectConstDeclaration(constNode, scope);

  expect(scope.constraints).toHaveLength(1);
  expect(scope.constraints[0]).toMatchObject([
    {
      type: NodeType.InferenceRequired,
      name: "t0",
    },
    {
      type: NodeType.NativeType,
      kind: "string",
    },
  ]);
});

test.only("collect const declaration constraints with function expression as value", () => {
  const functionNode = basicFn({
    parameters: [
      param("a", { typeAnnotation: typeAnnotation(inferenceRequired()) }),
    ],
    body: {
      type: NodeType.Block,
      body: [
        {
          type: NodeType.BinaryOperation,
          left: number("2"),
          right: id("a"),
          op: "addition",
        },
      ],
    },
  });
  const constDec = constDeclaration(
    "someFn",
    functionNode,
    typeAnnotation(inferenceRequired())
  );

  const scope = createScope();
  bindConstDeclaration(constDec, scope);
  collectConstDeclaration(constDec, scope);
  console.log(scope);
  expect(scope.constraints).toHaveLength(2);
});
