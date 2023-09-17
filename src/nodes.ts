import { Scope, TypeSymbol, ValueSymbol } from "./scope";

export enum NodeType {
  Program = 4,
  ModuleDeclaration,
  OpenStatement,
  ImportStatement,
  Block,
  EmptyStatement,
  DebuggerStatement,
  ConstDeclaration,
  EnumDeclaration,
  TypeDeclaration,
  TypeDeclarationName,
  EnumMember,
  AliasableIdentifier,
  DestructureBinding,
  JsxElement,
  JsxChild,
  ArrayLiteral,
  ObjectLiteral,
  ObjectProperty,
  TemplateLiteral,
  TemplateHead,
  TemplateSpan,
  TemplateTail,
  IfElseExpression,
  FunctionExpression,
  ParenthsizedExpression,
  AwaitExpression,
  MatchExpression,
  PipeExpression,
  MatchClause,
  DataPattern,
  Parameter,
  TypeAnnotation,
  InferenceRequired,
  OfTypeExpression,
  ConditionalTypeExpression,
  TypeReference,
  IntersectionType,
  ObjectType,
  PropertyTypeDefinition,
  VariantType,
  FunctionType,
  FunctionCallType,
  TupleType,
  TemplateLiteralType,
  PrimitiveValue,
  LiteralType,
  NativeType,
  BinaryOperation,
  UnaryOperation,
  IndexAccessCall,
  DotNotationCall,
  FunctionCall,
  EnumCall,
  Identifier,
}

export type Node =
  | Program
  | ModuleDeclaration
  | Statement
  | OpenStatement
  | ImportStatement
  | AliasableIdentifier
  | ConstDeclaration
  | EnumDeclaration
  | EnumMember
  | DestructureBinding
  | TypeDeclaration
  | TypeAnnotation
  | OfTypeExpression
  | VariantType
  | IntersectionType
  | ObjectType
  | PropertyTypeDefinition
  | TypeReference
  | InferenceRequired
  | DebuggerStatement
  | JsxElement
  | PrimitiveValue
  | JsxElement
  | JsxChild
  | Block
  | ParenthsizedExpression
  | PipeExpression
  | FunctionExpression
  | Parameter
  | AwaitExpression
  | MatchExpression
  | Pattern
  | DataPattern
  | IfElseExpression
  | FunctionCall
  | DotNotationCall
  | IndexAccessCall
  | LiteralType
  | NativeType
  | TemplateLiteral
  | TemplateHead
  | TemplateSpan
  | TemplateTail
  | ObjectProperty
  | ObjectLiteral
  | ArrayLiteral
  | TypeExpression
  | Identifier;

export type Program = {
  type: NodeType.Program;
  filename?: string;
  moduleDeclaration?: ModuleDeclaration;
  openStatements?: OpenStatement[];
  importStatements?: ImportStatement[];
  body?: BodyItem[];
  scope?: Scope;
};

export type ModuleDeclaration = {
  type: NodeType.ModuleDeclaration;
  namespace: string;
  exporting?: AliasableIdentifier[];
};

export type OpenStatement = {
  type: NodeType.OpenStatement;
  namespace: string;
  importing: AliasableIdentifier[];
};

export type ImportStatement = {
  type: NodeType.ImportStatement;
  packageName: string;
  importing?: AliasableIdentifier;
  isDefaultImport?: boolean;
  isStarImport?: boolean;
};

export type AliasableIdentifier = {
  type: NodeType.AliasableIdentifier;
  name: string;
  sourceName: string;
};

export type BodyItem = Statement | Declaration;
export type Declaration = ConstDeclaration | TypeDeclaration | EnumDeclaration;

export type ConstDeclaration = {
  type: NodeType.ConstDeclaration;
  name: Identifier | DestructureBinding;
  typeAnnotation: TypeAnnotation;
  value: Expression;
};

export type EnumDeclaration = {
  type: NodeType.EnumDeclaration;
  identifier: Identifier;
  parameters: Identifier[];
  members: EnumMember[];
  scope?: Scope;
};

export type EnumMember = {
  type: NodeType.EnumMember;
  identifier: Identifier;
  parameters: Identifier[];
};

export type DestructureBinding = {
  type: NodeType.DestructureBinding;
  sourceType: "object" | "array";
  identifiers: AliasableIdentifier[];
};

export type TypeDeclaration = {
  type: NodeType.TypeDeclaration;
  identifier: Identifier;
  parameters: Identifier[];
  value: TypeExpression;
  scope?: Scope;
};

export type TypeAnnotation = {
  type: NodeType.TypeAnnotation;
  expression: InferenceRequired | TypeExpression;
};

export type TypeExpression =
  | TypeAnnotation
  | OfTypeExpression
  | VariantType
  | ObjectType
  | InferenceRequired
  | TypeReference
  | NativeType
  | FunctionType
  | FunctionCallType
  | LiteralType
  | Identifier
  | Parameter;

export type OfTypeExpression = {
  type: NodeType.OfTypeExpression;
  expression: TypeExpression;
  kind: "typeof" | "keyof";
};

export type VariantType = {
  type: NodeType.VariantType;
  types: TypeExpression[];
};

export type ObjectType = {
  type: NodeType.ObjectType;
  definitions: PropertyTypeDefinition[];
};

export type PropertyTypeDefinition = {
  type: NodeType.PropertyTypeDefinition;
  name: Identifier;
  value: TypeExpression;
};

export type IntersectionType = {
  type: NodeType.IntersectionType;
  left: TypeExpression;
  right: TypeExpression;
};

export type TypeReference = {
  type: NodeType.TypeReference;
  identifier: Identifier | LiteralType | NativeType;
  arguments: TypeExpression[];
};

export type FunctionType = {
  type: NodeType.FunctionType;
  parameters: Parameter[];
  returnType: TypeAnnotation;
  identifier?: Identifier;
};

export type FunctionCallType = {
  type: NodeType.FunctionCallType;
  arguments: TypeExpression[];
  returnType: TypeExpression;
  callee: TypeExpression;
  // maybe add: identifier: Identifier;
};

export type InferenceRequired = {
  type: NodeType.InferenceRequired;
  name?: string;
};

export type Statement = Block | Expression | DebuggerStatement;

export type DebuggerStatement = { type: NodeType.DebuggerStatement };

export type Expression =
  | JsxElement
  | PrimitiveValue
  | Identifier
  | IfElseExpression
  | BinaryOperation
  | MatchExpression
  | FunctionCall
  | FunctionExpression;

export type JsxElement = {
  type: NodeType.JsxElement;
  isFragment: boolean;
  tagName: string;
  attributes: Record<string, string | JsxElement | Expression>;
  wasSelfClosing: boolean;
  children: JsxChild[];
};

export type JsxChild = {
  type: NodeType.JsxChild;
  expression: string | JsxElement | BodyItem;
};

export type Block = {
  type: NodeType.Block;
  body?: BodyItem[];
  scope?: Scope;
};

export type ParenthsizedExpression = {
  type: NodeType.ParenthsizedExpression;
  expression: Expression;
};

export type PipeExpression = {
  type: NodeType.PipeExpression;
  direction: "forward" | "backward";
  left: Expression;
  right: Expression;
};

export type FunctionExpression = {
  type: NodeType.FunctionExpression;
  async: boolean;
  parameters: Parameter[];
  returnType: TypeAnnotation;
  body: Statement;
  scope?: Scope;
  identifier?: Identifier;
};

export type AwaitExpression = {
  type: NodeType.AwaitExpression;
  expression: Expression;
};

export type IfElseExpression = {
  type: NodeType.IfElseExpression;
  condition: Expression;
  trueBlock: Statement;
  falseBlock: Statement;
};

export type MatchExpression = {
  type: NodeType.MatchExpression;
  subject: Expression;
  clauses: MatchClause[];
};

export type MatchClause = {
  type: NodeType.MatchClause;
  isDefault: boolean;
  pattern: Pattern;
  body: Statement;
  scope?: Scope;
};

export type Pattern =
  | DataPattern
  | Identifier
  | PrimitiveValue
  | ArrayLiteral
  | ObjectLiteral
  | TemplateLiteral;

export type DataPattern = {
  type: NodeType.DataPattern;
  name: Identifier;
  destructure: Identifier[];
};

export type Parameter = {
  type: NodeType.Parameter;
  isSpread?: boolean;
  identifier: Identifier;
  typeAnnotation: TypeAnnotation;
};

export type FunctionCall = {
  type: NodeType.FunctionCall;
  expression: Expression;
  typeArguments: TypeExpression[];
  arguments: Expression[];
};

export type DotNotationCall = {
  type: NodeType.DotNotationCall;
  left: Expression;
  right: Identifier;
};

export type IndexAccessCall = {
  type: NodeType.IndexAccessCall;
  expression: Expression;
  indexArgument: Expression;
};

export type DataCall = {
  type: NodeType.EnumCall;
  expression: Expression;
  arguments: Expression[];
};

export type LiteralType = {
  type: NodeType.LiteralType;
  literal: string;
};

export type NativeType = {
  type: NodeType.NativeType;
  kind:
    | "string"
    | "number"
    | "boolean"
    | "void"
    | "array"
    | "object"
    | "unknown";
};

export type TemplateLiteral = {
  type: NodeType.TemplateLiteral;
  head: TemplateHead;
  spans: TemplateSpan[];
};

export type TemplateHead = {
  type: NodeType.TemplateHead;
  text: string;
};

export type TemplateSpan = {
  type: NodeType.TemplateSpan;
  expression: Expression;
  text: TemplateTail | string;
};

export type TemplateTail = {
  type: NodeType.TemplateTail;
  text: string;
};

export type ObjectLiteral = {
  type: NodeType.ObjectLiteral;
  properties: ObjectProperty[];
};

export type ObjectProperty = {
  type: NodeType.ObjectProperty;
  name: Identifier | PrimitiveValue;
  value: Expression;
};

export type ArrayLiteral = {
  type: NodeType.ArrayLiteral;
  items: Expression[];
};

export type PrimitiveValue = {
  type: NodeType.PrimitiveValue;
  kind: "string" | "number" | "boolean" | "void";
  value: string | number | boolean | void;
};

export type BinaryOperation = {
  type: NodeType.BinaryOperation;
  left: Expression;
  right: Expression;
  op:
    | "multiply"
    | "divide"
    | "modulo"
    | "exponentiation"
    | "addition"
    | "subtraction"
    | "coalesce"
    | "equal"
    | "notEqual"
    | "logicalOr"
    | "logicalAnd"
    | "bitwiseOr"
    | "bitwiseXor"
    | "bitwiseAnd"
    | "lessThan"
    | "greaterThan"
    | "lessOrEqual"
    | "greaterOrEqual"
    | "leftShift"
    | "rightShiftLogical"
    | "rightShiftArithmetic"
    | "instanceOf";
};

export type UnaryOperation = {
  type: NodeType.UnaryOperation;
  op: "increment" | "decrement" | "bitwiseNot" | "logicalNot" | "typeof";
  expression: Expression;
};

export type Identifier = { type: NodeType.Identifier; name: string };
