import analyzeAst from "./analyzer.ts";
import { dumpNode, makeAst } from "./ast.ts";
import { render } from "./backends/typescript.ts";
import { match } from "./parser.ts";
import { glob } from "npm:glob@^10.3.3";
import { jsonc } from "npm:jsonc@^2.0.0";
import { dirname, join } from "std/path/posix.ts";
import { ensureDir } from "std/fs/mod.ts";

export type FlyOptions = {
  srcFile: string;
};

export async function compile(options: FlyOptions) {
  const flyConfig = await jsonc.read("./flyconfig.jsonc");
  console.log(flyConfig);
  await Promise.all(flyConfig.srcRoots.map(async (srcRoot: string) => {
    const globPattern = `${srcRoot}/**/*.fly`;
    const files = await glob(globPattern);
    return Promise.all(files.map(async (file) => {
      const source = await Deno.readTextFile(file);
      const ts = compileSourceString(source);
      const outFile = join(flyConfig.outDir, file.replace(/\.fly$/, ".ts"));
      await ensureDir(dirname(outFile));
      await Deno.writeTextFile(outFile, ts);
    }));
  }));
}

export function compileSourceString(source: string) {
  const matchResult = match(source);

  if (matchResult.failed()) throw new Error(matchResult.message);

  const ast = makeAst(matchResult);

  console.log("===== AST =====");
  console.dir(dumpNode(ast), { depth: null });
  console.log("   ");

  console.log("===== Analyzer =====");
  const safeAst = analyzeAst(ast);
  console.log(safeAst);

  const code = render(ast);
  console.log("==== CODE =====");
  console.log(code);

  return code;
}
