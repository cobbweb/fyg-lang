import * as ohm from "ohm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const grammarDef = Deno.readTextFileSync(__dirname + "/flitescript.ohm");
export const grammar = ohm.grammar(grammarDef);

export function match(code: string) {
  return grammar.match(code);
}
