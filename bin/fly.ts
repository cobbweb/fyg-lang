import { compile, FlyOptions } from "../src/flitescript.ts";

const sourceFile = Deno.args[0];

const options: FlyOptions = {
  srcFile: sourceFile,
};

compile(options);
