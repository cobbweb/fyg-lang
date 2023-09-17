import * as ohm from "ohm-js";
import { grammar } from "./parser.ts";
import {
  AliasableIdentifier,
  ArrayLiteral,
  AwaitExpression,
  BinaryOperation,
  Block,
  ConstDeclaration,
  DataCall,
  DataPattern,
  DotNotationCall,
  Expression,
  EnumDeclaration,
  EnumMember,
  FunctionCall,
  FunctionExpression,
  FunctionType,
  Identifier,
  IfElseExpression,
  ImportStatement,
  IndexAccessCall,
  MatchClause,
  MatchExpression,
  ModuleDeclaration,
  NativeType,
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
  Pattern,
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

const typeInferenceRequired: TypeAnnotation = {
  type: NodeType.TypeAnnotation,
  expression: { type: NT.InferenceRequired },
};

export const semantics = grammar.createSemantics().addOperation("toAST", {
  Script(
    moduleDeclaration: W,
    openStatements: W,
    importStatements: W,
    body: W
  ): Program {
    return {
      type: NT.Program,
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
    identifiers: W
  ): ModuleDeclaration {
    return {
      type: NT.ModuleDeclaration,
      namespace: namespace.toAST(),
      exporting: identifiers.toAST(),
    };
  },

  ModuleDeclaration_all(_module: W, namespace: W): ModuleDeclaration {
    return {
      type: NT.ModuleDeclaration,
      namespace: namespace.sourceString,
    };
  },

  OpenStatement_some(
    _open: W,
    identifiers: W,
    _from: W,
    namespace: W
  ): OpenStatement {
    return {
      type: NT.OpenStatement,
      namespace: namespace.toAST(),
      importing: identifiers.toAST(),
    };
  },

  OpenStatement_all(_open: W, namespace: W): OpenStatement {
    return {
      type: NT.OpenStatement,
      namespace: namespace.toAST(),
      importing: [],
    };
  },

  ImportStatement_some(
    _import: W,
    identifiers: W,
    _from: W,
    packageName: W
  ): ImportStatement {
    return {
      type: NT.ImportStatement,
      packageName: packageName.toAST(),
      importing: identifiers.toAST(),
    };
  },

  ImportStatement_cjs(
    _import: W,
    _star: W,
    _as: W,
    identifier: W,
    _from: W,
    packageName: W
  ): ImportStatement {
    return {
      type: NT.ImportStatement,
      packageName: packageName.toAST(),
      importing: identifier.toAST(),
      isStarImport: true,
    };
  },

  ImportStatement_default(
    _import: W,
    identifier: W,
    _from: W,
    packageName: W
  ): ImportStatement {
    return {
      type: NT.ImportStatement,
      packageName: packageName.toAST(),
      importing: identifier.toAST(),
      isDefaultImport: true,
    };
  },

  ImportStatement_bindless(_import: W, packageName: W): ImportStatement {
    return { type: NT.ImportStatement, packageName: packageName.toAST() };
  },

  Block(_o: W, body: W, _c: W): Block {
    return {
      type: NT.Block,
      body: body.toAST(),
    };
  },

  ConstDeclaration(
    _const: W,
    identifier: W,
    typeAnnotation: W,
    _eq: W,
    value: W
  ): ConstDeclaration {
    return {
      type: NT.ConstDeclaration,
      name: identifier.toAST(),
      typeAnnotation: optional(typeAnnotation) || typeInferenceRequired,
      value: value.toAST(),
    };
  },

  ConstObjectDestructureItem_alias(
    sourceIdentifier: W,
    _c: W,
    targetIdentifier: W
  ): AliasableIdentifier {
    return {
      type: NT.AliasableIdentifier,
      name: targetIdentifier.toAST(),
      sourceName: sourceIdentifier.toAST(),
    };
  },

  // EnumDeclaration = enum customTypeName GenericDeclaration? BoundedDangleListOf<"{", EnumMember, ",", "}">
  EnumDeclaration(_enum: W, name: W, params: W, body: W): EnumDeclaration {
    return {
      type: NodeType.EnumDeclaration,
      identifier: name.toAST(),
      parameters: params.toAST(),
      members: body.toAST(),
    };
  },

  EnumMember_params(name: W, params: W): EnumMember {
    return {
      type: NodeType.EnumMember,
      identifier: name.toAST(),
      parameters: params.toAST(),
    };
  },

  EnumMember(name: W) {
    return {
      type: NodeType.EnumMember,
      identifier: name.toAST(),
      parameters: [],
    };
  },

  TypeAnnotation(_c: W, typeExpression: W): TypeAnnotation {
    return {
      type: NT.TypeAnnotation,
      expression: typeExpression.toAST(),
    };
  },

  TypeExpression_typeof(_k: W, typeExpression: W): OfTypeExpression {
    return {
      type: NT.OfTypeExpression,
      kind: "typeof",
      expression: typeExpression.toAST(),
    };
  },

  TypeExpression_keyof(_k: W, typeExpression: W): OfTypeExpression {
    return {
      type: NT.OfTypeExpression,
      kind: "keyof",
      expression: typeExpression.toAST(),
    };
  },

  TypeExpression_arrayShorthand(typeExpression: W, _b: W): TypeReference {
    return {
      type: NT.TypeReference,
      identifier: { type: NodeType.Identifier, name: "array" },
      arguments: typeExpression.toAST(),
    };
  },

  TypeExpression_intersection(left: W, _amp: W, right: W) {
    return {
      type: NT.IntersectionType,
      left: left.toAST(),
      right: right.toAST(),
    };
  },

  VariantType_multi(_p: W, base: W, _sep: W, rest: W): VariantType {
    return {
      type: NodeType.VariantType,
      types: [base.toAST(), ...listOf(rest)],
    };
  },

  VariantType_single(_p: W, type: W): VariantType {
    return {
      type: NodeType.VariantType,
      types: [type.toAST()],
    };
  },

  TypeDeclaration(
    _type: W,
    identifier: W,
    genericDeclaration: W,
    _eq: W,
    value: W
  ): TypeDeclaration {
    return {
      type: NT.TypeDeclaration,
      identifier: identifier.toAST(),
      parameters: children(genericDeclaration),
      value: value.toAST(),
    };
  },

  TypeReference(identifier: W, args: W): TypeReference {
    return {
      type: NT.TypeReference,
      identifier: identifier.toAST(),
      arguments: optional(args),
    };
  },

  TypeArguments(args: W) {
    return args.toAST();
  },

  ObjectType(definitions: W): ObjectType {
    return {
      type: NodeType.ObjectType,
      definitions: definitions.toAST(),
    };
  },

  PropertyTypeDefinition_standard(
    identifier: W,
    _c: W,
    typeExpression: W
  ): PropertyTypeDefinition {
    return {
      type: NodeType.PropertyTypeDefinition,
      name: identifier.toAST(),
      value: typeExpression.toAST(),
    };
  },

  FunctionType(params: W, _arrow: W, returnType: W): FunctionType {
    return {
      type: NodeType.FunctionType,
      parameters: params.toAST(),
      returnType: returnType.toAST(),
    };
  },

  FunctionExpression_parens(
    parameters: W,
    returnType: W,
    _arrow: W,
    body: W
  ): FunctionExpression {
    return {
      type: NT.FunctionExpression,
      async: false,
      parameters: parameters.toAST(),
      returnType: optional(returnType) || typeInferenceRequired,
      body: body.toAST(),
    };
  },

  FunctionExpression_async(_async: W, fn: W): FunctionExpression {
    return {
      ...fn.toAST(),
      async: true,
    };
  },

  Parameter(spread: W, identifier: W, typeAnnotation: W): Parameter {
    return {
      type: NT.Parameter,
      typeAnnotation: optional(typeAnnotation),
      identifier: identifier.toAST(),
      isSpread: spread._node.matchLength === 3,
    };
  },

  CallExpression_function(
    identifier: W,
    typeArguments: W,
    args: W
  ): FunctionCall {
    return {
      type: NT.FunctionCall,
      expression: identifier.toAST(),
      typeArguments: typeArguments.toAST(),
      arguments: args.toAST(),
    };
  },

  CallExpression_dot(left: W, _dot: W, right: W): DotNotationCall {
    return {
      type: NT.DotNotationCall,
      left: left.toAST(),
      right: right.toAST(),
    };
  },

  CallExpression_index(left: W, _sq1: W, index: W, _sq2: W): IndexAccessCall {
    return {
      type: NT.IndexAccessCall,
      expression: left.toAST(),
      indexArgument: index.toAST(),
    };
  },

  CallExpression_enum(left: W, args: W): DataCall {
    return {
      type: NodeType.EnumCall,
      expression: left.toAST(),
      arguments: args.toAST(),
    };
  },

  IfElseExpression(
    _if: W,
    _op: W,
    condition: W,
    _cp: W,
    trueBlock: W,
    _else: W,
    falseBlock: W
  ): IfElseExpression {
    return {
      type: NodeType.IfElseExpression,
      condition: condition.toAST(),
      trueBlock: trueBlock.toAST(),
      falseBlock: falseBlock.toAST(),
    };
  },

  MatchExpression(_m: W, subject: W, matchBlock: W): MatchExpression {
    return {
      type: NodeType.MatchExpression,
      subject: subject.toAST(),
      clauses: matchBlock.toAST(),
    };
  },

  MatchSubject(_o: W, expression: W, _c: W): Expression {
    return expression.toAST();
  },

  MatchBlock(_o: W, cases: W, _c: W): MatchClause[] {
    return cases.toAST();
  },

  MatchClause(matches: W, _a: W, body: W): MatchClause {
    return {
      type: NodeType.MatchClause,
      pattern: matches.toAST(),
      body: body.toAST(),
      isDefault: matches.sourceString === "default",
    };
  },

  MatchPattern_parens(_o: W, pattern: W, _c: W): Pattern {
    return pattern.toAST();
  },

  DataPattern(name: W, destructure: W): DataPattern {
    return {
      type: NodeType.DataPattern,
      name: name.toAST(),
      destructure: destructure.toAST(),
    };
  },

  AwaitExpression(_await: W, expression: W): AwaitExpression {
    return {
      type: NodeType.AwaitExpression,
      expression: expression.toAST(),
    };
  },

  ForwardPipeExpression_pipe(left: W, _pipe: W, right: W) {
    return {
      type: NT.PipeExpression,
      direction: "backward",
      left: left.toAST(),
      right: right.toAST(),
    };
  },

  BackwardPipeExpression_pipe(left: W, _pipe: W, right: W): PipeExpression {
    return {
      type: NT.PipeExpression,
      direction: "backward",
      left: left.toAST(),
      right: right.toAST(),
    };
  },

  PrimaryExpression_parenExpr(
    _o: W,
    expression: W,
    _c: W
  ): ParenthsizedExpression {
    return {
      type: NT.ParenthsizedExpression,
      expression: expression.toAST(),
    };
  },

  JsxElement_wrap(openingTag: W, kids: W, _closingTag: W) {
    return {
      type: NT.JsxElement,
      // TODO: handle attributes
      tagName: openingTag.toAST(),
      children: children(kids.toAST()),
    };
  },

  ObjectLiteral(props: W): ObjectLiteral {
    return {
      type: NodeType.ObjectLiteral,
      properties: props.toAST(),
    };
  },

  ArrayLiteral(items: W): ArrayLiteral {
    return {
      type: NodeType.ArrayLiteral,
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
    tail: W
  ): TemplateLiteral {
    const tailSpan: TemplateSpan = {
      type: NT.TemplateSpan,
      expression: expression.toAST(),
      text: tail.toAST(),
    };
    return {
      type: NT.TemplateLiteral,
      head: head.toAST(),
      spans: [...children(spans), tailSpan],
    };
  },

  templateHead(_o: W, string: W, _c: W): TemplateHead {
    return {
      type: NT.TemplateHead,
      text: optional(string) || "",
    };
  },

  templateTail(_c: W, string: W, _b: W): TemplateTail {
    return {
      type: NT.TemplateTail,
      text: optional(string) || "",
    };
  },

  templateCharacters(_chars: W) {
    return this.sourceString;
  },

  PropertyAssignment_basic(name: W, _c: W, value: W): ObjectProperty {
    return {
      type: NT.ObjectProperty,
      name: name.toAST(),
      value: value.toAST(),
    };
  },

  AdditiveExpression_add(left: W, _minus: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "addition",
    };
  },

  AdditiveExpression_sub(left: W, _minus: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "subtraction",
    };
  },

  BitwiseORExpression_bor(left: W, _op: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "bitwiseOr",
    };
  },

  BitwiseXORExpression_bxor(left: W, _op: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "bitwiseXor",
    };
  },

  BitwiseANDExpression_band(left: W, _op: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "bitwiseAnd",
    };
  },

  EqualityExpression_equal(left: W, _eq: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "equal",
    };
  },

  EqualityExpression_notEqual(left: W, _eq: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "notEqual",
    };
  },

  RelationalExpression_lt(left: W, _op: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "lessThan",
    };
  },

  RelationalExpression_gt(left: W, _op: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "greaterThan",
    };
  },

  RelationalExpression_le(left: W, _op: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "lessOrEqual",
    };
  },

  RelationalExpression_ge(left: W, _op: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "greaterOrEqual",
    };
  },

  ShiftExpression_lsl(left: W, _op: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "leftShift",
    };
  },

  ShiftExpression_lsr(left: W, _op: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "rightShiftLogical",
    };
  },

  ShiftExpression_asr(left: W, _op: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "rightShiftArithmetic",
    };
  },

  MultiplicativeExpression_mul(left: W, _op: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "multiply",
    };
  },

  MultiplicativeExpression_div(left: W, _op: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "divide",
    };
  },

  MultiplicativeExpression_mod(left: W, _op: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "modulo",
    };
  },

  ExponentianExpression_expo(left: W, _op: W, right: W): BinaryOperation {
    return {
      type: NodeType.BinaryOperation,
      left: left.toAST(),
      right: right.toAST(),
      op: "exponentiation",
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
    return { type: NT.Identifier, name: name.sourceString };
  },

  identifierName(start: W, rest: W): Identifier {
    return {
      type: NT.Identifier,
      name: start.sourceString + rest.sourceString,
    };
  },

  namespace(names: W) {
    return names.sourceString;
  },

  noSubstitutionTemplate(_o: W, string: W, _c: W): PrimitiveValue {
    return {
      type: NT.PrimitiveValue,
      kind: "string",
      value: string.sourceString,
    };
  },

  customTypeName(_start: W, _rest: W): Identifier {
    return { type: NT.Identifier, name: this.sourceString };
  },

  nativeTypes(_type: W): NativeType {
    const referencedType = this.sourceString as NativeType["kind"];
    return { type: NT.NativeType, kind: referencedType };
  },

  stringLiteral(_q: W, string: W, _q2: W): PrimitiveValue {
    return {
      type: NT.PrimitiveValue,
      kind: "string",
      value: children(string).join(""),
    };
  },

  decimalLiteral_bothParts(
    _whole: W,
    _dot: W,
    _decimal: W,
    _expo: W
  ): PrimitiveValue {
    return {
      type: NT.PrimitiveValue,
      kind: "number",
      value: this.sourceString,
    };
  },

  decimalLiteral_decimalsOnly(_dot: W, _decimal: W, _expo: W): PrimitiveValue {
    return {
      type: NT.PrimitiveValue,
      kind: "number",
      value: `0${this.sourceString}`,
    };
  },

  decimalLiteral_integerOnly(_int: W, _expo: W): PrimitiveValue {
    return {
      type: NT.PrimitiveValue,
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
export function makeAst(
  filename: string,
  matchResult: ohm.MatchResult
): Program {
  const program = semantics(matchResult).toAST();
  program.filename = filename;
  return program;
}

/**
 * Helper function when debugging any AST node, it swaps out type
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
      if (key === "type" && node.type in NodeType) {
        const nodeName = NodeType[node.type];
        return [key, nodeName];
      }

      if (key === "scope") {
        return [key, "[Scope omitted]"];
      }

      return [key, dumpNode(value)];
    }
  );

  return Object.fromEntries(result);
}
