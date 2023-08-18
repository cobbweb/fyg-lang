import { dumpNode, makeAst } from "./ast.ts";
import { match } from "./parser.ts";
import { jsonc } from "jsonc";
import { getSrcFilesList } from "./files.ts";
import { buildModulesList } from "./modules.ts";

export type FlyOptions = {
  srcRoots: string[];
  outDir: string;
  checkTypes?: boolean;
  debug?: boolean;
};

export async function compile(options: FlyOptions) {
  const flyConfig: FlyOptions = await jsonc.read("./flyconfig.jsonc");
  const flyOptions = { ...flyConfig, ...options };

  const files = await getSrcFilesList(flyOptions.srcRoots);
  // console.log(files);
  const programList = await Promise.all(
    files.map(([filename, source]) => astFromFile(filename, source))
  );
  // console.log(programList);
  const globalScope = buildModulesList(programList);
  // console.log(globalScope);

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
  console.log(dumpNode(ast));
  return ast;
}
