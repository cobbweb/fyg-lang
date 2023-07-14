import * as ohm from "ohm";
import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const grammarDef = fs.readFileSync(__dirname + "/flitescript.ohm", "utf-8");
const grammar = ohm.grammar(grammarDef);

export function match(code: string) {
  return grammar.match(code);
}
