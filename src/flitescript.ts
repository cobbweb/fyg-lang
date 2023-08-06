import analyzeAst from "./analyzer.ts";
import { dumpNode, makeAst } from "./ast.ts";
import { render } from "./backends/typescript.ts";
import { match } from "./parser.ts";
import fg from "fast-glob";
import { jsonc } from "jsonc";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";

export type FlyOptions = {
  srcRoots: string[];
  outDir: string;
  checkTypes?: boolean;
  debug?: boolean;
};

export async function compile(options: FlyOptions) {
  const flyConfig: FlyOptions = await jsonc.read("./flyconfig.jsonc");
  const flyOptions = { ...flyConfig, ...options };

  await Promise.all(flyOptions.srcRoots.map(async (srcRoot: string) => {
    const globPattern = `${srcRoot}/**/*.fly`;
    const files = await fg(globPattern);

    return Promise.all(files.map(async (file) => {
      const source = await Bun.file(file).text();
      const ts = compileSourceString(source, flyOptions);
      const outFile = join(flyOptions.outDir, file.replace(/\.fly$/, ".ts"));
      await mkdir(dirname(outFile), { recursive: true });
      await Bun.write(outFile, ts);
    }));
  }));
}

export function compileSourceString(source: string, options?: FlyOptions) {
  const debug = options?.debug || false;
  const checkTypes = options?.checkTypes ?? true;
  const matchResult = match(source);

  if (matchResult.failed()) throw new Error(matchResult.message);

  const ast = makeAst(matchResult);
  const safeAst = checkTypes ? analyzeAst(ast) : false;
  const code = render(ast);

  if (debug) {
    console.log("===== AST =====");
    console.dir(dumpNode(ast), { depth: null });
    console.log("   ");

    if (safeAst) {
      console.log("===== Analyzer =====");
      console.log(safeAst);
    }

    console.log("==== CODE =====");
    console.log(code);
  }

  return code;
}
