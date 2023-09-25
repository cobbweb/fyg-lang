import { Expression, NodeType, Statement } from "../nodes";
import { Scope } from "../scope";

export function getLastExpression(
  node: Statement | Expression,
  fallbackScope: Scope
): [Expression | undefined, Scope] {
  if (node.type === NodeType.Block) {
    return getLastExpression(node.body?.at(-1), node.scope!);
  } else {
    // TODO: Handle debugger statement
    return [node, fallbackScope];
  }
}
