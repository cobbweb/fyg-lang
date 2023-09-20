import { NodeType, TypeExpression } from "../nodes";

// cut through the crap, pull an actual type out of meta-type nodes
export default function unwrapTypeNode(typeExpr: TypeExpression) {
  if (typeExpr.type === NodeType.TypeAnnotation) {
    return unwrapTypeNode(typeExpr.expression);
  }

  if (typeExpr.type === NodeType.TypeReference) {
    return unwrapTypeNode(typeExpr.identifier);
  }

  return typeExpr;
}
