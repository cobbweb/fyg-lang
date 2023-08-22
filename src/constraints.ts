import { BodyItem, ConstDeclaration, NodeType, Program } from "./nodes";
import { Scope, TypeVar } from "./scope";

export function collectProgram(program: Required<Program>) {
  program.body?.forEach((item) => collectBodyItem(item, program.scope));
}

export function collectBodyItem(bodyItem: BodyItem, scope: Scope): TypeVar {
  if (bodyItem.type === NodeType.ConstDeclaration) {
    return collectConstDeclaration(bodyItem, scope);
  }

  return "unknown";
}

export function collectConstDeclaration(
  constDec: ConstDeclaration,
  scope: Scope
): TypeVar {}
