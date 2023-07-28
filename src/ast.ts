import * as ohm from "ohm";
import { grammar } from "./parser.ts";
import {
  AliasableIdentifier,
  ArrayLiteral,
  AwaitExpression,
  Block,
  ConstDeclaration,
  DataConstructor,
  DotNotationCall,
  FunctionCall,
  FunctionExpression,
  Identifier,
  ImportStatement,
  IndexAccessCall,
  LiteralType,
  ModuleDeclaration,
  Node,
  NodeType,
  NodeType as NT,
  ObjectLiteral,
  ObjectProperty,
  ObjectType,
  OfTypeExpression,
  OpenStatement,
  Parameter,
  ParenthsizedExpression,
  PipeExpression,
  PrimitiveValue,
  Program,
  PropertyTypeDefinition,
  TemplateHead,
  TemplateLiteral,
  TemplateSpan,
  TemplateTail,
  TypeAnnotation,
  TypeDeclaration,
  TypeReference,
  VariantType,
} from "./nodes.ts";

// @ts-ignore - Deno not pulling types for Ohm for some reason
type W = ohm.Wrapper & { toAST: () => object };

const optional = (node: W) =>
  node.children.length ? node.children[0].toAST() : undefined;
const children = (node: W) => node.children.map((c: W) => c.toAST());
const listOf = (node: W) => node.asIteration().toAST();

export const semantics = grammar.createSemantics().addOperation("toAST", {
  Script(
    moduleDeclaration: W,
    openStatements: W,
    importStatements: W,
    body: W,
  ): Program {
    return {
      _type: NT.Program,
      moduleDeclaration: optional(moduleDeclaration),
      openStatements: children(openStatements),
      importStatements: children(importStatements),
      body: body.toAST(),
    };
  },

  ScriptBody_one(bodyItem: W, _sc: W, moreItems: W, _sc2: W) {
    const items = [bodyItem.toAST(), ...children(moreItems)];
    return items;
  },

  ModuleDeclaration_selective(
    _module: W,
    namespace: W,
    _exporting: W,
    identifiers: W,
  ): ModuleDeclaration {
    return {
      _type: NT.ModuleDeclaration,
      namespace: listOf(namespace),
      exporting: identifiers.toAST(),
    };
  },

  ModuleDeclaration_all(_module: W, namespace: W): ModuleDeclaration {
    return {
      _type: NT.ModuleDeclaration,
      namespace: namespace.sourceString,
    };
  },

  OpenStatement_some(
    _open: W,
    identifiers: W,
    _from: W,
    namespace: W,
  ): OpenStatement {
    return {
      _type: NT.OpenStatement,
      namespace: namespace.toAST(),
      importing: identifiers.toAST(),
    };
  },

  OpenStatement_all(_open: W, namespace: W): OpenStatement {
    return {
      _type: NT.OpenStatement,
      namespace: namespace.toAST(),
      importing: [],
    };
  },

  ImportStatement_some(
    _import: W,
    identifiers: W,
    _from: W,
    packageName: W,
  ): ImportStatement {
    return {
      _type: NT.ImportStatement,
      packageName: packageName.toAST(),
      importing: identifiers.toAST(),
    };
  },

  ImportStatement_cjs(
    _import: W,
    _star: W,
    _as: "*",
    identifier: W,
    _from: W,
    packageName: W,
  ): ImportStatement {
    return {
      _type: NT.ImportStatement,
      packageName: packageName.toAST(),
      importing: identifier.toAST(),
      isStarImport: true,
    };
  },

  ImportStatement_default(
    _import: W,
    identifier: W,
    _from: W,
    packageName: W,
  ): ImportStatement {
    return {
      _type: NT.ImportStatement,
      packageName: packageName.toAST(),
      importing: identifier.toAST(),
      isDefaultImport: true,
    };
  },

  ImportStatement_bindless(_import: W, packageName: W): ImportStatement {
    return { _type: NT.ImportStatement, packageName: packageName.toAST() };
  },

  Block(_o: W, body: W, _c: W): Block {
    return {
      _type: NT.Block,
      body: body.toAST(),
    };
  },

  ConstDeclaration(
    _const: W,
    identifier: W,
    typeAnnotation: W,
    _eq: W,
    value: W,
  ): ConstDeclaration {
    return {
      _type: NT.ConstDeclaration,
      name: identifier.toAST(),
      typeAnnotation: optional(typeAnnotation) ||
        { _type: NT.InferenceRequired },
      value: value.toAST(),
    };
  },

  ConstObjectDestructureItem_alias(
    sourceIdentifier: W,
    _c: W,
    targetIdentifier: W,
  ): AliasableIdentifier {
    return {
      _type: NT.AliasableIdentifier,
      name: targetIdentifier,
      sourceName: sourceIdentifier,
    };
  },

  TypeAnnotation(_c: W, typeExpression: W): TypeAnnotation {
    return {
      _type: NT.TypeAnnotation,
      expression: typeExpression.toAST(),
    };
  },

  TypeExpression_typeof(_k: W, typeExpression: W): OfTypeExpression {
    return {
      _type: NT.OfTypeExpression,
      kind: "typeof",
      expression: typeExpression,
    };
  },

  TypeExpression_keyof(_k: W, typeExpression: W): OfTypeExpression {
    return {
      _type: NT.OfTypeExpression,
      kind: "keyof",
      expression: typeExpression,
    };
  },

  TypeExpression_arrayShorthand(typeExpression: W, _b: W): TypeReference {
    return {
      _type: NT.TypeReference,
      identifier: { _type: NodeType.Identifier, name: "array" },
      arguments: typeExpression.toAST(),
    };
  },

  TypeExpression_intersection(left: W, _amp: W, right: W) {
    return {
      _type: NT.IntersectionType,
      left: left.toAST(),
      right: right.toAST(),
    };
  },

  VariantType_multi(_p: W, base: W, _sep: W, rest: W): VariantType {
    return {
      _type: NodeType.VariantType,
      types: [
        base.toAST(),
        ...listOf(rest),
      ],
    };
  },

  VariantType_single(_p: W, type: W): VariantType {
    return {
      _type: NodeType.VariantType,
      types: [type.toAST()],
    };
  },

  TypeDeclaration(
    _type: W,
    identifier: W,
    genericDeclaration: W,
    _eq: W,
    value: W,
  ): TypeDeclaration {
    return {
      _type: NT.TypeDeclaration,
      identifier: identifier.toAST(),
      parameters: children(genericDeclaration),
      value: value.toAST(),
    };
  },

  TypeReference(identifier: W, args: W): TypeReference {
    return {
      _type: NT.TypeReference,
      identifier: identifier.toAST(),
      arguments: optional(args),
    };
  },

  TypeArguments(args: W) {
    return args.toAST();
  },

  DataConstructor_noParams(identifier: W): DataConstructor {
    return {
      _type: NT.DataConstructor,
      identifier: identifier.toAST(),
      parameters: [],
    };
  },

  DataConstructor_params(identifier: W, params: W): DataConstructor {
    return {
      _type: NT.DataConstructor,
      identifier: identifier.toAST(),
      parameters: params.toAST(),
    };
  },

  dataConstructorName(_c: W, identifier: W): Identifier {
    return identifier.toAST();
  },

  ObjectType(definitions: W): ObjectType {
    return {
      _type: NodeType.ObjectType,
      definitions: definitions.toAST(),
    };
  },

  PropertyTypeDefinition_standard(
    identifier: W,
    _c: W,
    typeExpression: W,
  ): PropertyTypeDefinition {
    return {
      _type: NodeType.PropertyTypeDefinition,
      name: identifier.toAST(),
      value: typeExpression.toAST(),
    };
  },

  FunctionExpression_parens(
    parameters: W,
    returnType: W,
    _arrow: W,
    body: W,
  ): FunctionExpression {
    return {
      _type: NT.FunctionExpression,
      async: false,
      parameters: parameters.toAST(),
      returnType: returnType.toAST(),
      body: body.toAST(),
    };
  },

  FunctionExpression_async(
    _async: W,
    fn: W,
  ): FunctionExpression {
    return {
      ...fn.toAST(),
      async: true,
    };
  },

  Parameter(spread: W, identifier: W, typeAnnotation: W): Parameter {
    return {
      _type: NT.Parameter,
      typeAnnotation: optional(typeAnnotation),
      identifier: identifier.toAST(),
      isSpread: spread._node.matchLength === 3,
    };
  },

  CallExpression_function(
    identifier: W,
    typeArguments: W,
    args: W,
  ): FunctionCall {
    return {
      _type: NT.FunctionCall,
      expression: identifier.toAST(),
      typeArguments: typeArguments.toAST(),
      arguments: args.toAST(),
    };
  },

  CallExpression_dot(
    left: W,
    _dot: W,
    right: W,
  ): DotNotationCall {
    return {
      _type: NT.DotNotationCall,
      left: left.toAST(),
      right: right.toAST(),
    };
  },

  CallExpression_index(left: W, _sq1: W, index: W, _sq2: W): IndexAccessCall {
    return {
      _type: NT.IndexAccessCall,
      expression: left.toAST(),
      indexArgument: index.toAST(),
    };
  },

  AwaitExpression(_await: W, expression: W): AwaitExpression {
    return {
      _type: NodeType.AwaitExpression,
      expression: expression.toAST(),
    };
  },

  ForwardPipeExpression_pipe(
    left: W,
    _pipe: W,
    right: W,
  ) {
    return {
      _type: NT.PipeExpression,
      direction: "backward",
      left: left.toAST(),
      right: right.toAST(),
    };
  },

  BackwardPipeExpression_pipe(
    left: W,
    _pipe: W,
    right: W,
  ): PipeExpression {
    return {
      _type: NT.PipeExpression,
      direction: "backward",
      left: left.toAST(),
      right: right.toAST(),
    };
  },

  PrimaryExpression_parenExpr(
    _o: W,
    expression: W,
    _c: W,
  ): ParenthsizedExpression {
    return {
      _type: NT.ParenthsizedExpression,
      expression: expression.toAST(),
    };
  },

  JsxElement_wrap(openingTag: W, kids: W, _closingTag: W) {
    return {
      _type: NT.JsxElement,
      // TODO: handle attributes
      tagName: openingTag.toAST(),
      children: children(kids.toAST()),
    };
  },

  ObjectLiteral(props: W): ObjectLiteral {
    return {
      _type: NodeType.ObjectLiteral,
      properties: props.toAST(),
    };
  },

  ArrayLiteral(items: W): ArrayLiteral {
    return {
      _type: NodeType.ArrayLiteral,
      items: items.toAST(),
    };
  },

  TemplateLiteral_nosub(string: W): PrimitiveValue {
    return string.toAST();
  },

  TemplateLiteral_withsub(
    head: W,
    spans: W,
    expression: W,
    tail: W,
  ): TemplateLiteral {
    const tailSpan: TemplateSpan = {
      _type: NT.TemplateSpan,
      expression: expression.toAST(),
      text: tail.toAST(),
    };
    return {
      _type: NT.TemplateLiteral,
      head: head.toAST(),
      spans: [...children(spans), tailSpan],
    };
  },

  templateHead(_o: W, string: W, _c: W): TemplateHead {
    return {
      _type: NT.TemplateHead,
      text: optional(string) || "",
    };
  },

  templateTail(_c: W, string: W, _b: W): TemplateTail {
    return {
      _type: NT.TemplateTail,
      text: optional(string) || "",
    };
  },

  templateCharacters(_chars: W) {
    return this.sourceString;
  },

  PropertyAssignment_basic(name: W, _c: W, value: W): ObjectProperty {
    return {
      _type: NT.ObjectProperty,
      name: name.toAST(),
      value: value.toAST(),
    };
  },

  PropertyName_identifier(identifier: W): Identifier {
    return identifier.toAST();
  },

  JsxSelfClosingElement(_a1: W, _identifier: W, _attributes: W, _a2: W) {},

  BoundedDangleListOf(_open: W, items: W, _sep: W, _close: W) {
    return listOf(items);
  },

  BoundedDangleNonemptyListOf_notEmpty(_open: W, items: W, _sep: W, _close: W) {
    return listOf(items);
  },

  BoundedDangleNonemptyListOf_empty(_open: W, _close: W) {},

  identifier(name: W): Identifier {
    return { _type: NT.Identifier, name: name.sourceString };
  },

  identifierName(start: W, rest: W): Identifier {
    return {
      _type: NT.Identifier,
      name: start.sourceString + rest.sourceString,
    };
  },

  namespace(names: W) {
    return listOf(names);
  },

  noSubstitutionTemplate(_o: W, string: W, _c: W): PrimitiveValue {
    return {
      _type: NT.PrimitiveValue,
      kind: "string",
      value: string.sourceString,
    };
  },

  customTypeName(_start: W, _rest: W): Identifier {
    return { _type: NT.Identifier, name: this.sourceString };
  },

  nativeTypes(_type: W): LiteralType {
    return { _type: NT.LiteralType, literal: this.sourceString };
  },

  stringLiteral(_q: W, string: W, _q2: W): PrimitiveValue {
    return {
      _type: NT.PrimitiveValue,
      kind: "string",
      value: children(string).join(""),
    };
  },

  decimalLiteral_bothParts(
    _whole: W,
    _dot: W,
    _decimal: W,
    _expo: W,
  ): PrimitiveValue {
    return {
      _type: NT.PrimitiveValue,
      kind: "number",
      value: this.sourceString,
    };
  },

  decimalLiteral_decimalsOnly(_dot: W, _decimal: W, _expo: W): PrimitiveValue {
    return {
      _type: NT.PrimitiveValue,
      kind: "number",
      value: `0${this.sourceString}`,
    };
  },

  decimalLiteral_integerOnly(_int: W, _expo: W): PrimitiveValue {
    return {
      _type: NT.PrimitiveValue,
      kind: "number",
      value: this.sourceString,
    };
  },

  sc(_: W, _2: W) {},

  _terminal() {
    return this.sourceString;
  },

  _iter(...children: W[]) {
    return children.map((c) => c.toAST());
  },
});

// @ts-ignore editor can't see type decs for ohm
export function makeAst(matchResult: ohm.MatchResult) {
  const builder = semantics(matchResult).toAST();
  return builder;
}

/**
 * Helper function when debugging any AST node, it swaps out _type
 * integers for their actual name in the NodeType enum
 */
export function dumpNode(node: Node | Node[]): object {
  if (!node) return {};

  if (Array.isArray(node)) {
    return node.map((n) => dumpNode(n));
  }

  if (typeof node !== "object") {
    return node;
  }

  const result = Object.entries(node as Node).map(
    ([key, value]): [string, unknown] => {
      if (key === "_type" && node._type in NodeType) {
        const nodeName = NodeType[node._type];
        return [key, nodeName];
      }

      return [key, dumpNode(value)];
    },
  );

  return Object.fromEntries(result);
}
