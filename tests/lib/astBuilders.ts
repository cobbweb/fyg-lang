import {
  ConstDeclaration,
  NodeType,
  Identifier,
  PrimitiveValue,
  InferenceRequired,
  NativeType,
  FunctionExpression,
  Parameter,
  TypeExpression,
  TypeAnnotation,
  Expression,
} from "../../src/nodes";

export function createBasicConst(
  name: string,
  value: string | boolean | number
): ConstDeclaration {
  const kind = typeof value as "string" | "boolean" | "number";
  return {
    type: NodeType.ConstDeclaration,
    typeAnnotation: {
      type: NodeType.TypeAnnotation,
      expression: { type: NodeType.InferenceRequired },
    },
    name: id(name),
    value: { type: NodeType.PrimitiveValue, kind, value },
  };
}

export function constDeclaration(
  name: string,
  value: Expression,
  typeAnnotation: TypeAnnotation
): ConstDeclaration {
  return {
    type: NodeType.ConstDeclaration,
    typeAnnotation,
    name: id(name),
    value: value,
  };
}

export function basicFn(
  attributes: Partial<FunctionExpression>
): FunctionExpression {
  const defaults: FunctionExpression = {
    type: NodeType.FunctionExpression,
    async: false,
    parameters: [],
    returnType: typeAnnotation({ type: NodeType.InferenceRequired }),
    body: { type: NodeType.Block, body: undefined },
  };

  return { ...defaults, ...attributes };
}

export function param(name: string, attributes: Partial<Parameter> = {}) {
  const defaults: Parameter = {
    type: NodeType.Parameter,
    identifier: id(name),
    typeAnnotation: typeAnnotation({
      type: NodeType.InferenceRequired,
      name: `tParam${name}`,
    }),
    isSpread: false,
  };
  return { ...defaults, ...attributes };
}

export function typeAnnotation(expression: TypeExpression): TypeAnnotation {
  return {
    type: NodeType.TypeAnnotation,
    expression,
  };
}

export function id(name: string): Identifier {
  return { type: NodeType.Identifier, name };
}

export function number(value: string): PrimitiveValue {
  return {
    type: NodeType.PrimitiveValue,
    kind: "number",
    value,
  };
}

export function string(value: string): PrimitiveValue {
  return {
    type: NodeType.PrimitiveValue,
    kind: "string",
    value,
  };
}

export function inferenceRequired(): InferenceRequired {
  return { type: NodeType.InferenceRequired };
}

export function typeVar(name: string): InferenceRequired {
  return {
    type: NodeType.InferenceRequired,
    name,
  };
}

export function numberType(): NativeType {
  return {
    type: NodeType.NativeType,
    kind: "number",
  };
}
