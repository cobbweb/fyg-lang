import { assertEquals } from "testing/asserts.ts";
import { match } from "../src/parser.ts";
import { NodeType } from "../src/nodes.ts";
import { dumpNode, makeAst } from "../src/ast.ts";

class SyntaxError extends Error {}

function getAST(code) {
  const matchResult = match(code);

  if (matchResult.failed()) {
    throw new SyntaxError(matchResult.message);
  }

  return makeAst(matchResult);
}

Deno.test("basic ast test", () => {
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
            arguments: [],
            identifier: { _type: NodeType.LiteralType, literal: "string" },
          },
        },
        value: { _type: NodeType.PrimitiveValue, kind: "string", value: "foo" },
      },
    ],
  };
  const actual = getAST(code);
  assertEquals(actual, expectProgram);
});
