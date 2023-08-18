import { test, expect } from "bun:test";
import { createScope, createSymbol } from "../src/scope";
import { NodeType } from "../src/nodes";
import {
  bindConstDeclaration,
  bindExpression,
  bindBlock,
  bind,
  bindFunction,
  bindPattern,
  bindEnum,
} from "../src/binder";

function createBasicConst(name, value) {
  return {
    type: NodeType.ConstDeclaration,
    typeAnnotation: { type: NodeType.InferenceRequired },
    name: id(name),
    value: { type: NodeType.PrimitiveValue, kind: typeof value, value },
  };
}

function id(name) {
  return { type: NodeType.Identifier, name };
}

test("binding an PrimitiveValue expression should not modify scope", () => {
  const scope = createScope();
  const ast = {
    type: NodeType.PrimitiveValue,
    kind: "string",
    value: "Hello world!",
  };

  const newScope = bindExpression(ast, scope);
  expect(newScope).toEqual(createScope());
});

test("bind a const should add it's identifier to the scope's values", () => {
  const scope = createScope();
  const constNode = createBasicConst("foobar", "hello world!");

  const newScope = bindConstDeclaration(constNode, scope);
  expect(newScope.value).toHaveProperty("foobar");
  expect(newScope.value.foobar).toEqual(
    createSymbol("value", "foobar", createScope())
  );
});

test("a block expression should create a child scope", () => {
  const topScope = createScope();
  const blockNode = {
    type: NodeType.Block,
    body: undefined,
  };
  const blockScope = bindBlock(blockNode, topScope);
  expect(blockScope).toEqual(createScope(topScope));
});

test("sibling blocks should have their own scopes in the parent scope", () => {
  const programNode = {
    type: NodeType.Program,
    body: [
      { type: NodeType.Block, body: undefined },
      { type: NodeType.Block, body: undefined },
    ],
  };
  const rootScope = bind(programNode);
  expect(rootScope.children).toHaveLength(2);
});

test("functions get their own scope", () => {
  const functionNode = {
    type: NodeType.FunctionExpression,
    async: false,
    parameters: [],
    returnType: { type: NodeType.InferenceRequired },
    body: { type: NodeType.Block, body: undefined },
  };
  const topScope = createScope();
  const fnScope = bindFunction(functionNode, topScope);

  expect(topScope.children).toHaveLength(1);
  expect(fnScope.parent).toBe(topScope);
});

test("function params get bound to function's scope", () => {
  const functionNode = {
    type: NodeType.FunctionExpression,
    async: false,
    parameters: [
      {
        type: NodeType.Parameter,
        typeAnnotation: { type: NodeType.InferenceRequired },
        identifier: id("paramOne"),
      },
    ],
    returnType: { type: NodeType.InferenceRequired },
    body: { type: NodeType.Block, body: undefined },
  };
  const topScope = createScope();
  const fnScope = bindFunction(functionNode, topScope);

  expect(fnScope.value).toHaveProperty("paramOne");
});

test("const declaration in a function body are bound to the function's scope", () => {
  const constName = "constInFnScope";
  const functionNode = {
    type: NodeType.FunctionExpression,
    async: false,
    parameters: [],
    returnType: { type: NodeType.InferenceRequired },
    body: {
      type: NodeType.Block,
      body: [createBasicConst(constName, "hello")],
    },
  };
  const topScope = createScope();
  const fnScope = bindFunction(functionNode, topScope);

  // the block statement creates in own scope inside the fnStatement
  expect(fnScope.children).toHaveLength(1);
  expect(fnScope.children[0].value).toHaveProperty(constName);
});

test("if/else branches get their own sibling scopes", () => {
  const trueConst = "trueConst";
  const falseConst = "falseConst";
  const ifNode = {
    type: NodeType.IfElseExpression,
    condition: { type: NodeType.PrimitiveValue, kind: "boolean", value: true },
    trueBlock: {
      type: NodeType.Block,
      body: [createBasicConst(trueConst, trueConst)],
    },
    falseBlock: {
      type: NodeType.Block,
      body: [createBasicConst(falseConst, falseConst)],
    },
  };
  const topScope = createScope();
  bindExpression(ifNode, topScope);

  expect(topScope.children).toHaveLength(2);
  expect(topScope.children[0].value).toHaveProperty(trueConst);
  expect(topScope.children[0].value).not.toHaveProperty(falseConst);
  expect(topScope.children[1].value).toHaveProperty(falseConst);
  expect(topScope.children[1].value).not.toHaveProperty(trueConst);
});

test("match clauses get their own sibling scopes", () => {
  const matchNode = {
    type: NodeType.MatchExpression,
    subject: id("myConst"),
    clauses: [
      {
        type: NodeType.MatchClause,
        isDefault: false,
        pattern: {
          type: NodeType.PrimitiveValue,
          kind: "boolean",
          value: "true",
        },
        body: {
          type: NodeType.FunctionCall,
          expression: id("whenMyConstIsTrue"),
          typeArguments: [],
          arguments: [],
        },
      },
      {
        type: NodeType.MatchClause,
        isDefault: false,
        pattern: {
          type: NodeType.PrimitiveValue,
          kind: "boolean",
          value: "false",
        },
        body: {
          type: NodeType.FunctionCall,
          expression: id("whenMyConstIsFalse"),
          typeArguments: [],
          arguments: [],
        },
      },
    ],
  };
  const topScope = createScope();
  bindExpression(matchNode, topScope);

  expect(topScope.children).toHaveLength(2);
});

test("pattern matching on an identifier adds it to scope", () => {
  const patternOne = id("patternOne");
  const topScope = createScope();

  bindPattern(patternOne, topScope);

  expect(topScope.value).toHaveProperty("patternOne");
});

test("binding on a data pattern adds the destructure items to scope", () => {
  const dataPattern = {
    type: NodeType.DataPattern,
    name: id("myData"),
    destructure: [id("argOne"), id("argTwo")],
  };
  const scope = createScope();
  bindPattern(dataPattern, scope);

  expect(scope.value).toHaveProperty("argOne");
  expect(scope.value).toHaveProperty("argTwo");
});

test("destructure identifiers in data patterns must have unique names", () => {
  const dataPattern = {
    type: NodeType.DataPattern,
    name: id("myData"),
    destructure: [id("argOne"), id("argOne")],
  };
  const scope = createScope();

  expect(() => bindPattern(dataPattern, scope)).toThrow(/redeclare/);
});

test("can pattern match on array literals", () => {
  const arrayLiteral = {
    type: NodeType.ArrayLiteral,
    items: [
      { type: NodeType.PrimitiveValue, kind: "string", value: "firstItem" },
      id("secondItem"),
    ],
  };

  const scope = createScope();
  bindPattern(arrayLiteral, scope);

  expect(scope.value).toHaveProperty("secondItem");
});

test("enums are bound to scope", () => {
  const enumNode = {
    type: NodeType.EnumDeclaration,
    identifier: id("FooEnum"),
    parameters: [],
    members: [],
  };
  const scope = createScope();
  bindEnum(enumNode, scope);

  expect(scope.value).toHaveProperty("FooEnum");
});

test("enums create a scope for members and type params", () => {
  const enumNode = {
    type: NodeType.EnumDeclaration,
    identifier: id("FooEnum"),
    parameters: [],
    members: [],
  };
  const scope = createScope();
  bindEnum(enumNode, scope);

  expect(scope.children).toHaveLength(1);
});

test("enum params are bound to the child scope", () => {
  const enumNode = {
    type: NodeType.EnumDeclaration,
    identifier: id("GenericEnum"),
    parameters: [id("T"), id("Z")],
    members: [],
  };

  const scope = createScope();
  bindEnum(enumNode, scope);

  expect(scope.children).toHaveLength(1);
  expect(scope.children[0].type).toHaveProperty("T");
  expect(scope.children[0].type).toHaveProperty("Z");
});

test("enum members are bound to enums scope", () => {
  const enumNode = {
    type: NodeType.EnumDeclaration,
    identifier: id("Membenum"),
    parameters: [],
    members: [
      { type: NodeType.EnumMember, identifier: id("Left"), parameters: [] },
      { type: NodeType.EnumMember, identifier: id("Right"), parameters: [] },
    ],
  };
  const scope = createScope();
  bindEnum(enumNode, scope);

  expect(scope.children).toHaveLength(1);
  expect(scope.children[0].value).toHaveProperty("Left");
  expect(scope.children[0].value).toHaveProperty("Right");
});
