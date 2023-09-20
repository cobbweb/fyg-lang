import * as ohm from "ohm-js";

const grammarDef = await Bun.file(__dirname + "/flite.ohm").text();
export const grammar = ohm.grammar(grammarDef);

export function match(code: string) {
  return grammar.match(code);
}
