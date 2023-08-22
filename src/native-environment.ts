export enum Types {
  Boolean,
  Number,
  String,
  Nebulous,
  Function,
  Void,
  Object,
  Array,
}

export type Type =
  | BooleanType
  | NumberType
  | StringType
  | NebulousType
  | FunctionType;

export type BooleanType = {
  kind: Types.Boolean;
};

export type NumberType = {
  kind: Types.Number;
};

export type StringType = {
  kind: Types.String;
};

export type NebulousType = {
  kind: Types.Nebulous;
};

export type FunctionType = {
  kind: Types.Function;
  parameters: Type[];
  return: Type[];
};

export type ArrayType = {
  kind: Types.Array;
  innerType: Type;
};

export type ObjectType = {
  kind: Types.Object;
  map: Record<string, Type>;
};
