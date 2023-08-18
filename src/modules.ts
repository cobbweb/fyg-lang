import { Program } from "./nodes";

type GlobalScope = {
  modules: Record<string, Program>;
};

export const globalScope: GlobalScope = { modules: {} };

export function addModule(name: string, program: Program): GlobalScope {
  if (name in globalScope) {
    throw new Error(`Cannot redeclare module ${name}`);
  }

  globalScope.modules[name] = program;
  return globalScope;
}

export function buildModulesList(programList: Program[]): GlobalScope {
  programList
    .filter((program) => program.moduleDeclaration)
    .forEach((program) =>
      // @ts-ignore tsc doesn't understand the filter check above
      addModule(program.moduleDeclaration.namespace, program)
    );

  return globalScope;
}
