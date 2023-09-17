import { NodeType, Statement } from "../nodes";

export function getLastExpression(node: Statement) {
  if (node.type === NodeType.Block) {
    return node.body?.at(-1);
  } else {
    // TODO: Handle debugger statement
    return node;
  }
}
