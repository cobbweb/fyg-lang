import { match } from "../src/parser.ts";
import { NodeType } from "../src/nodes.ts";
import { makeAst } from "../src/ast.ts";
import { test, expect } from "bun:test";

class SyntaxError extends Error { }

function getAST(code) {
  const matchResult = match(code);

  if (matchResult.failed()) {
    throw new SyntaxError(matchResult.message);
  }

  return makeAst(matchResult);
}

test("basic ast test", () => {
  const code = `const baz: string = 'foo'`;
  const expectProgram = {
    _type: NodeType.Program,
    moduleDeclaration: undefined,
    openStatements: [],
    importStatements: [],
    body: [
      {
        _type: NodeType.ConstDeclaration,
        name: { _type: NodeType.Identifier, name: "baz" },
        typeAnnotation: {
          _type: NodeType.TypeAnnotation,
          expression: {
            _type: NodeType.TypeReference,
            arguments: undefined,
            identifier: { _type: NodeType.NativeType, kind: "string" },
          },
        },
        value: { _type: NodeType.PrimitiveValue, kind: "string", value: "foo" },
      },
    ],
  };
  const actual = getAST(code);
  expect(actual).toEqual(expectProgram)
});
