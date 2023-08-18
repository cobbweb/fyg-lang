import { match } from "../src/parser.ts";
import { NodeType } from "../src/nodes.ts";
import { test, expect } from "bun:test";
import { dumpNode, makeAst } from "../src/ast.ts";

class SyntaxError extends Error {}

function getAST(code) {
  const matchResult = match(code);

  if (matchResult.failed()) {
    throw new SyntaxError(matchResult.message);
  }

  return makeAst("./testing/source.fly", matchResult);
}

test("basic ast test", () => {
  const code = `const baz: string = 'foo'`;
  const expectProgram = {
    type: NodeType.Program,
    moduleDeclaration: undefined,
    openStatements: [],
    importStatements: [],
    filename: "./testing/source.fly",
    body: [
      {
        type: NodeType.ConstDeclaration,
        name: { type: NodeType.Identifier, name: "baz" },
        typeAnnotation: {
          type: NodeType.TypeAnnotation,
          expression: {
            type: NodeType.TypeReference,
            arguments: undefined,
            identifier: { type: NodeType.NativeType, kind: "string" },
          },
        },
        value: { type: NodeType.PrimitiveValue, kind: "string", value: "foo" },
      },
    ],
  };
  const actual = getAST(code);
  expect(actual).toEqual(expectProgram);
});

const astSnapshots = [
  ["basic module declaration", "module Foo.Bar.Baz", true],
  [
    "module declaration with selective exporting",
    "module Foo.Bar exporting { baz, zuu }",
  ],
  ["wide open statement", "open Foo.Bar"],
  ["selective open statement", "open { foo, bar } from Baz"],
  ["boundless import statement", "import `dotenv`"],
  ["default import statement", "import express from `express`"],
  ["selective import statement", "import { expect, test } from `testing-lib`"],
  ["star import statement", "import * as React from `react`"],
  [
    "block with literals",
    `{
\`foo\`
true
123
433_123_2.34
.14
}`,
  ],
  ["template string with interpolation", "`Hello ${name}!`"],
  ["array literal", "[1, 2, 3]"],
  ["object literal with parens", "({ name: `Andrew`, age: 109 })"],
  ["const declaration without annotation", "const one = 1"],
  ["const declaration with annotation", "const two: number = 2"],
  [
    "const declaration with typeof in annotation",
    "const email: typeof Email = `foo@bar.com`",
  ],
  ["const declaration with array destructuring", `const [one, two] = [1, 2]`],
  ["const declaration with object destructuring", `const { name } = user`],
  [
    "const declaration with object destructuring to an alias",
    `const { name: foo } = user`,
  ],
  ["const declaration with a function", `const greet = (name: string) => {}`],
  [
    "const declaration with an async function",
    "const fetch = async (url: string) => {}",
  ],
  ["typeof type expression", "type Foo = typeof Bar"],
  ["keyof type expression", "type Foo = keyof Bar"],
  ["array shorthand type expression", "type Users = User[]"],
  ["intersection type expression", "type User = Guest & { password: string }"],
  ["simple enum (single)", `enum Foo { Bar }`],
  ["simple enum (multi)", `enum Direction { North, South, East, West }`],
  ["enum with generic", `enum Maybe<T> { Some<T>, None }`],
  ["function type expression", "type AuthFn = (user: User) => AuthResult"],
  ["calling a function", "greet(`World`)"],
  ["calling an async function", "await fetch(url)"],
  ["calling a function with type arguments", "await fetchModel<User>(url)"],
  ["dot notation expression", "foo.bar"],
  ["index access on an identifier", "foo[2]"],
  ["data value call", "Some<`test`>"],
  [
    "if/else expression on single line",
    "if (true) trueBlock() else falseBlock()",
  ],
  [
    "if/else expression with blocks",
    `if (true) {
trueBlock()
} else {
falseBlock()
}`,
  ],
  [
    "match expression with basic literal patterns",
    `match (subject) {
  true -> trueBlock()
  \`yes\` -> trueBlock()
  14 -> gotNum()
}`,
  ],
  [
    "match expression with object literal patterns",
    `match (subject) {
  ({ type: PrimitiveValue, kind: 'boolean', value: 'true', }) -> makeBool(true)
  ({ type: PrimitiveValue, kind: 'boolean', value, }) -> makeBool(value)
  ({ type, }) -> next(type)
}`,
    true, // SKIPPING
  ],
  [
    "forward pipe with placeholder expression",
    "10 |> Console.log(`num: %d`, @)",
  ],
  ["backward pipe", "Console.log(`num: %d`) <| 10"],
  ["addition", "4 + 5"],
  ["subtraction", "5 - 4"],
  ["multiplication", "5 * 4"],
  ["division", "20 / 4"],
  ["exponentiation", "2 ** 10"],
  ["maths operators combined", "4 + 5 * 10 / 2 - 1"],
  ["equality comparison", "true == true"],
  ["inequality comparison", "true != false"],
];

astSnapshots.forEach(([name, code, doSkip]) => {
  const testFn = doSkip ? test.skip : test;
  testFn(name, () => {
    const ast = getAST(code);
    expect(dumpNode(ast)).toMatchSnapshot();
  });
});
