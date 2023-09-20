import { dumpNode, makeAst } from "./ast.ts";
import { match } from "./parser.ts";
import { jsonc } from "jsonc";
import { getSrcFilesList } from "./files.ts";
import { buildModulesList } from "./modules.ts";
import { bindProgram } from "./binder.ts";
import { collectProgram } from "./constraints.ts";
import { analyzeProgram } from "./analyze.ts";
import { dumpScope } from "./scope.ts";

export type FlyOptions = {
  srcRoots: string[];
  outDir: string;
  checkTypes?: boolean;
  debug?: boolean;
};

export async function compile(options: FlyOptions) {
  console.log("\n\n --- COMPILE ---\n\n");
  const flyConfig: FlyOptions = await jsonc.read("./flyconfig.jsonc");
  const flyOptions = { ...flyConfig, ...options };

  const files = await getSrcFilesList(flyOptions.srcRoots);
  const programList = await Promise.all(
    files.map(([filename, source]) => astFromFile(filename, source))
  );
  const globalScope = buildModulesList(programList);
  Object.entries(globalScope.modules).forEach(([_moduleName, program]) => {
    const scopedProgram = bindProgram(program);
    collectProgram(scopedProgram);
    analyzeProgram(scopedProgram);
    console.log(dumpScope(scopedProgram.scope));
  });

  // await Promise.all(
  //   flyOptions.srcRoots.map(async (srcRoot: string) => {
  //     const globPattern = `${srcRoot}/**/*.fly`;
  //     const files = await fg(globPattern);
  //
  //     return Promise.all(
  //       files.map(async (file) => {
  //         const source = await Bun.file(file).text();
  //         const ts = compileSourceString(source, flyOptions);
  //         const outFile = join(
  //           flyOptions.outDir,
  //           file.replace(/\.fly$/, ".ts")
  //         );
  //         await mkdir(dirname(outFile), { recursive: true });
  //         await Bun.write(outFile, ts);
  //       })
  //     );
  //   })
  // );
}

export function compileSourceString() {}

export async function astFromFile(filename: string, source: string) {
  const matchResult = match(source);

  if (matchResult.failed()) throw new Error(matchResult.message);

  const ast = makeAst(filename, matchResult);
  return ast;
}
