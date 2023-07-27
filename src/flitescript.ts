import { dumpNode, makeAst } from "./ast.ts";
import { render } from "./backends/typescript.ts";
import { match } from "./parser.ts";

export type FlyOptions = {
  srcFile: string;
};

export function compile(options: FlyOptions) {
  const sourceCode = Deno.readTextFileSync(options.srcFile);
  return compileSourceString(sourceCode);
}

export function compileSourceString(source: string) {
  const matchResult = match(source);

  if (matchResult.failed()) throw new Error(matchResult.message);

  const ast = makeAst(matchResult);

  console.log("===== AST =====");
  console.dir(dumpNode(ast), { depth: null });
  console.log("   ");

  const code = render(ast);
  console.log("==== CODE =====");
  console.log(code);

  return code;
}
