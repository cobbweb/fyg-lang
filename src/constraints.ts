import { SetRequired } from "type-fest";
import {
  Block,
  BodyItem,
  ConstDeclaration,
  Expression,
  FunctionCall,
  FunctionCallType,
  FunctionExpression,
  Identifier,
  NodeType,
  Program,
  Statement,
  TypeExpression,
} from "./nodes";
import {
  ConstraintType,
  Scope,
  createTypeVariable,
  findTypeSymbol,
  findValueSymbol,
} from "./scope";
import { getLastExpression } from "./lib/getLastExpression";
import { dumpNode } from "./ast";

export function collectProgram(program: SetRequired<Program, "scope">) {
  program.body?.forEach((item) => collectBodyItem(item, program.scope));
  return program;
}

export function collectBodyItem(
  bodyItem: BodyItem,
  scope: Scope
): ConstraintType {
  if (bodyItem.type === NodeType.ConstDeclaration) {
    return collectConstDeclaration(bodyItem, scope);
  }

  // @ts-ignore
  return "unknown";
}

export function collectConstDeclaration(
  constDec: ConstDeclaration,
  scope: Scope
): ConstraintType {
  const identifier =
    constDec.name.type === NodeType.Identifier
      ? constDec.name.name
      : constDec.name.identifiers[0].name; // Assuming first for simplification

  const existingTypeVar = scope.value[identifier]?.type;

  if (!existingTypeVar) {
    throw new Error(`Type variable for ${identifier} not found`);
  }

  const exprType = collectExpression(constDec.value, scope);

  // Add constraint between the existing type variable and the expression type
  scope.constraints.push([existingTypeVar, exprType]);

  return existingTypeVar;
}

export function collectStatement(statement: Statement, scope: Scope): void {
  if (statement.type === NodeType.Block) {
    collectBlock(statement);
  } else if (statement.type === NodeType.DebuggerStatement) {
    console.warn("collect debugger not implemented, hmmm?");
    // return collectDebuggerStatement(statement, scope);
  } else {
    // Must be an expression
    collectExpression(statement, scope);
  }
}

export function collectBlock(block: Block) {
  const blockScope = block.scope;
  if (!blockScope) {
    throw new Error("Block scope not found");
  }

  if (!block.body) return;

  const constraints = block.body.map((stmt) => {
    return collectBodyItem(stmt, blockScope);
  });

  return constraints.at(-1);
}

export function collectExpression(
  expr: Expression,
  scope: Scope
): ConstraintType {
  if (expr.type === NodeType.PrimitiveValue) {
    // Map the primitive value to its corresponding NativeType
    return {
      type: NodeType.NativeType,
      kind: expr.kind,
    };
  } else if (expr.type === NodeType.BinaryOperation) {
    const leftType = collectExpression(expr.left, scope);
    const rightType = collectExpression(expr.right, scope);

    // Add constraints based on the operator.
    switch (expr.op) {
      case "addition":
      case "subtraction":
      case "multiply":
      case "divide":
      case "exponentiation":
        // For simplicity, let's assume these must be numbers
        scope.constraints.push([
          leftType,
          { type: NodeType.NativeType, kind: "number" },
        ]);
        scope.constraints.push([
          rightType,
          { type: NodeType.NativeType, kind: "number" },
        ]);
        return { type: NodeType.NativeType, kind: "number" };

      case "logicalOr":
      case "logicalAnd":
        // These must be booleans
        scope.constraints.push([
          leftType,
          { type: NodeType.NativeType, kind: "boolean" },
        ]);
        scope.constraints.push([
          rightType,
          { type: NodeType.NativeType, kind: "boolean" },
        ]);
        return { type: NodeType.NativeType, kind: "boolean" };
    }
  } else if (expr.type === NodeType.FunctionExpression) {
    // @ts-ignore
    return collectFunctionDefinition(expr);
  } else if (expr.type === NodeType.FunctionCall) {
    return collectFunctionCall(expr, scope);
  } else if (expr.type === NodeType.Identifier) {
    return collectIdentifier(expr, scope);
  }

  console.log("TODO: collectExpression with %s", NodeType[expr.type]);

  // Handle other types of expressions here
  return { type: NodeType.NativeType, kind: "unknown" };
}

export function collectFunctionCall(
  fnCall: FunctionCall,
  scope: Scope
): FunctionCallType {
  if (fnCall.expression.type !== NodeType.Identifier) {
    console.log(
      "TODO: collect function call, handle advanced expressions as function names"
    );
  }
  const referenceFnName = (fnCall.expression as Identifier).name!;
  const referenceType = findValueSymbol(referenceFnName, scope);

  if (!referenceType)
    throw new Error(`Couldn't find a function named ${referenceFnName}`);
  const returnType = createTypeVariable(scope);
  return {
    type: NodeType.FunctionCallType,
    returnType,
    callee: referenceType.type,
    arguments: fnCall.arguments.map((arg: Expression) =>
      collectExpression(arg, scope)
    ),
  };
}

export function collectFunctionDefinition(
  fnExpression: SetRequired<FunctionExpression, "scope" | "identifier">
): TypeExpression {
  const fnScope = fnExpression.scope;

  // TODO: collect parameters?

  // Collect constraints for the return type
  const existingFunctionType = findTypeSymbol(
    fnExpression.identifier.name,
    fnScope
  );
  if (
    !existingFunctionType ||
    existingFunctionType.type.type !== NodeType.FunctionType
  ) {
    throw new Error("Function type not found in type symbol table");
  }

  const returnType = existingFunctionType.type.returnType.expression;

  // Collect constraints for the function body
  collectStatement(fnExpression.body, fnExpression.scope);

  const returnExpression = getLastExpression(fnExpression.body);
  const returnExpressionType = collectExpression(
    returnExpression as Expression,
    fnScope
  );
  if (returnExpressionType) {
    if (!returnType) throw new Error("no return type");
    fnScope.constraints.push([returnExpressionType, returnType]);
  }

  const fnType = findTypeSymbol(
    fnExpression.identifier.name,
    fnExpression.scope
  );
  if (!fnType)
    throw new Error(
      `Could not find function named ${fnExpression.identifier.name}`
    );

  return fnType.type;
}

export function collectIdentifier(
  identifier: Identifier,
  scope: Scope
): ConstraintType {
  const identifierType = findValueSymbol(identifier.name, scope);
  if (!identifierType)
    throw new Error(`Couldn't find type for ${identifier.name}`);

  if (!identifierType.type)
    throw new Error(`No type information for identifier ${identifier.name}`);

  return identifierType.type!;
}
