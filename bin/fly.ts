import { FlyOptions, compile } from "../src/flitescript.ts";

const sourceFile = Deno.args[0];

if (!sourceFile) throw new Error("No source file arg provided");

const options: FlyOptions = {
  srcFile: sourceFile,
};

compile(options);
