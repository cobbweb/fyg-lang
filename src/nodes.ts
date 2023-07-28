export enum NodeType {
  Program = 1,
  ModuleDeclaration,
  OpenStatement,
  ImportStatement,
  Block,
  EmptyStatement,
  DebuggerStatement,
  ConstDeclaration,
  TypeDeclaration,
  TypeDeclarationName,
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
  MatchCase,
  MatchDefaultCase,
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
  DataConstructor,
  TupleType,
  TemplateLiteralType,
  PrimitiveValue,
  LiteralType,
  BinaryOperation,
  UnaryOperation,
  IndexAccessCall,
  DotNotationCall,
  FunctionCall,
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
  | DestructureBinding
  | TypeDeclaration
  | TypeAnnotation
  | OfTypeExpression
  | VariantType
  | DataConstructor
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
  | FunctionCall
  | DotNotationCall
  | IndexAccessCall
  | LiteralType
  | TemplateLiteral
  | TemplateHead
  | TemplateSpan
  | TemplateTail
  | ObjectProperty
  | ObjectLiteral
  | ArrayLiteral
  | Identifier;

export type Program = {
  _type: NodeType.Program;
  moduleDeclaration?: ModuleDeclaration;
  openStatements?: OpenStatement[];
  importStatements?: ImportStatement[];
  body?: BodyItem[];
};

export type BodyItem = Statement | Declaration;

export type ModuleDeclaration = {
  _type: NodeType.ModuleDeclaration;
  namespace: string;
  exporting?: AliasableIdentifier[];
};

export type OpenStatement = {
  _type: NodeType.OpenStatement;
  namespace: string;
  importing: AliasableIdentifier[];
};

export type ImportStatement = {
  _type: NodeType.ImportStatement;
  packageName: string;
  importing?: AliasableIdentifier;
  isDefaultImport?: boolean;
  isStarImport?: boolean;
};

export type AliasableIdentifier = {
  _type: NodeType.AliasableIdentifier;
  name: string;
  sourceName: string;
};

export type Declaration = ConstDeclaration | TypeDeclaration;

export type ConstDeclaration = {
  _type: NodeType.ConstDeclaration;
  name: Identifier | DestructureBinding;
  typeAnnotation: TypeAnnotation;
  value: Expression;
};

export type DestructureBinding = {
  _type: NodeType.DestructureBinding;
  sourceType: "object" | "array";
  identifiers: AliasableIdentifier[];
};

export type TypeDeclaration = {
  _type: NodeType.TypeDeclaration;
  identifier: Identifier;
  parameters: string[];
  value: TypeExpression;
};

export type TypeAnnotation = {
  _type: NodeType.TypeAnnotation;
  expression: InferenceRequired | TypeExpression;
};

export type TypeExpression =
  | OfTypeExpression
  | VariantType
  | DataConstructor
  | ObjectType
  | InferenceRequired
  | TypeReference;

export type OfTypeExpression = {
  _type: NodeType.OfTypeExpression;
  expression: TypeExpression;
  kind: "typeof" | "keyof";
};

export type VariantType = {
  _type: NodeType.VariantType;
  types: DataConstructor[];
};

export type DataConstructor = {
  _type: NodeType.DataConstructor;
  identifier: Identifier;
  parameters: TypeExpression[];
};

export type ObjectType = {
  _type: NodeType.ObjectType;
  definitions: PropertyTypeDefinition[];
};

export type PropertyTypeDefinition = {
  _type: NodeType.PropertyTypeDefinition;
  name: Identifier;
  value: TypeExpression;
};

export type IntersectionType = {
  _type: NodeType.IntersectionType;
  left: TypeExpression;
  right: TypeExpression;
};

export type TypeReference = {
  _type: NodeType.TypeReference;
  identifier: Identifier;
  arguments: TypeExpression[];
};

export type InferenceRequired = { _type: NodeType.InferenceRequired };

export type Statement = Block | Expression | DebuggerStatement;

export type DebuggerStatement = { _type: NodeType.DebuggerStatement };

export type Expression = JsxElement | PrimitiveValue;

export type JsxElement = {
  _type: NodeType.JsxElement;
  isFragment: boolean;
  tagName: string;
  attributes: Record<string, (string | JsxElement | Expression)>;
  wasSelfClosing: boolean;
  children: JsxChild[];
};

export type JsxChild = {
  _type: NodeType.JsxChild;
  expression: string | JsxElement | BodyItem;
};

export type Block = {
  _type: NodeType.Block;
  body?: BodyItem[];
};

export type ParenthsizedExpression = {
  _type: NodeType.ParenthsizedExpression;
  expression: Expression;
};

export type PipeExpression = {
  _type: NodeType.PipeExpression;
  direction: "forward" | "backward";
  left: Expression;
  right: Expression;
};

export type FunctionExpression = {
  _type: NodeType.FunctionExpression;
  async: boolean;
  parameters: Parameter[];
  returnType: InferenceRequired | TypeExpression;
  body: Statement;
};

export type AwaitExpression = {
  _type: NodeType.AwaitExpression;
  expression: Expression;
};

export type Parameter = {
  _type: NodeType.Parameter;
  isSpread?: boolean;
  identifier: Identifier;
  typeAnnotation: TypeExpression;
};

export type FunctionCall = {
  _type: NodeType.FunctionCall;
  expression: Expression;
  typeArguments: TypeExpression[];
  arguments: Expression[];
};

export type DotNotationCall = {
  _type: NodeType.DotNotationCall;
  left: Expression;
  right: Identifier;
};

export type IndexAccessCall = {
  _type: NodeType.IndexAccessCall;
  expression: Expression;
  indexArgument: Expression;
};

export type LiteralType = {
  _type: NodeType.LiteralType;
  literal: string;
};

export type TemplateLiteral = {
  _type: NodeType.TemplateLiteral;
  head: TemplateHead;
  spans: TemplateSpan[];
};

export type TemplateHead = {
  _type: NodeType.TemplateHead;
  text: string;
};

export type TemplateSpan = {
  _type: NodeType.TemplateSpan;
  expression: Expression;
  text: TemplateTail | string;
};

export type TemplateTail = {
  _type: NodeType.TemplateTail;
  text: string;
};

export type ObjectLiteral = {
  _type: NodeType.ObjectLiteral;
  properties: ObjectProperty[];
};

export type ObjectProperty = {
  _type: NodeType.ObjectProperty;
  name: Identifier | PrimitiveValue;
  value: Expression;
};

export type ArrayLiteral = {
  _type: NodeType.ArrayLiteral;
  items: Expression[];
};

export type PrimitiveValue = {
  _type: NodeType.PrimitiveValue;
  kind: "string" | "number" | "boolean" | "void" | "regexp";
  value: string | number | boolean | void | RegExp;
};

export type Identifier = { _type: NodeType.Identifier; name: string };
