import { deepEquals } from "bun";
import { InferenceRequired, NodeType, Program, TypeExpression } from "./nodes";
import { ConstraintType, Scope, dumpScope, updateTypeSymbol } from "./scope";
import { dumpNode } from "./ast";

export function analyzeProgram(program: Program) {
  if (!program.scope) throw new Error("Program must have scope created");
  if (!program.body) return;

  unifyScope(program.scope);
  applySubstitutions(program.scope);
  // applySubstitution(program.scope);
  // normalizeSubstitutions(program.scope);
  return program;
}

export function applySubstitutions(scope: Scope) {
  const entries = Object.entries(scope.type);

  const hasChanges = entries.some(([typeVarName, typeSymbol]) => {
    const typeExpression = typeSymbol.type;

    switch (typeExpression.type) {
      case NodeType.Identifier:
      case NodeType.InferenceRequired:
        const referenceValue = substitutionSearch(typeVarName, scope);
        if (!referenceValue)
          throw new Error(
            `Could not find type var named ${typeVarName} in scope.substitution`
          );

        if ("name" in referenceValue && referenceValue.name === typeVarName) {
          return false;
        }
        updateTypeSymbol(typeVarName, referenceValue, scope);
        return true;

      case NodeType.FunctionType: {
        const returnType = typeExpression.returnType.expression;
        if (returnType.type === NodeType.InferenceRequired) {
          const subVal = substitutionSearch(returnType.name!, scope);
          typeExpression.returnType.expression = subVal ?? returnType;
        }

        const paramsChanged = typeExpression.parameters.some((param) => {
          const { typeAnnotation } = param;
          const { expression } = typeAnnotation;

          if (expression.type === NodeType.InferenceRequired) {
            const subVal = substitutionSearch(expression.name!, scope);
            typeAnnotation.expression = subVal ?? expression;
            return !!subVal;
          }
          return false;
        });

        const returnTypeChanged =
          typeExpression.returnType.expression !== returnType;
        if (returnTypeChanged || paramsChanged) {
          console.log("returnTypeChanged");
        }
        return returnTypeChanged || paramsChanged;
      }

      case NodeType.FunctionCallType:
        const argsChanged = typeExpression.arguments.some((arg, i) => {
          const subVal = substitutionSearch(arg, scope);
          typeExpression.arguments[i] = subVal ?? arg;
          return !!subVal;
        });

        const startReturnType = typeExpression.returnType;
        // check if the return type as already been inferred
        if (startReturnType.type === NodeType.InferenceRequired) {
          console.log("returnType needs inferring");
          const resolvedFnDefinition = substitutionSearch(
            typeExpression.callee,
            scope
          );

          if (!resolvedFnDefinition) {
            const name =
              "name" in typeExpression.callee
                ? typeExpression.callee?.name!
                : typeExpression.callee;
            throw new Error(`Could not find a fn definition from ${name}`);
          }

          if (resolvedFnDefinition.type !== NodeType.FunctionType)
            throw new Error(
              `Found type for function call is not a FunctionType`
            );

          const unwrappedNewReturnType =
            resolvedFnDefinition.returnType.type === NodeType.TypeAnnotation
              ? resolvedFnDefinition.returnType.expression
              : resolvedFnDefinition.returnType;

          if (unwrappedNewReturnType.type !== NodeType.InferenceRequired) {
            typeExpression.returnType = unwrappedNewReturnType;
            updateTypeSymbol(typeVarName, typeExpression, scope);
          }
        }

        const returnTypeChanged = typeExpression.returnType !== startReturnType;
        return argsChanged || returnTypeChanged;
    }

    return false;
  });

  if (hasChanges) {
    return applySubstitutions(scope);
  }

  scope.children.forEach((childScope) => applySubstitutions(childScope));
}

export function substitutionSearch(
  expr: string | TypeExpression,
  scope: Scope
): TypeExpression | undefined {
  // @ts-ignore
  const name = typeof expr === "string" ? expr : expr?.name;
  if (!name) return undefined;

  const value = scope.type[name];
  if (value) return value.type;

  if (scope.parent) return substitutionSearch(name, scope.parent);

  return undefined;
}

export function unifyScope(scope: Scope) {
  if (!scope.constraints)
    throw new Error(`Scope needs its constraints collected first`);

  unify(scope);
  scope.children.forEach((childScope) => unifyScope(childScope));
}

export function unify(scope: Scope) {
  scope.constraints.forEach(([typeA, typeB]) => {
    const a = substitutionSearch(typeA, scope) || typeA;
    const b = substitutionSearch(typeB, scope) || typeB;
    if (deepEquals(a, b)) return;

    if (isTypeVar(a) && isTypeVar(b)) {
      updateTypeSymbol(b.name!, a, scope);
      return;
    }

    if (isTypeVar(a)) {
      updateTypeSymbol(a.name!, b, scope);
      return;
    }

    if (isTypeVar(b)) {
      updateTypeSymbol(b.name!, a, scope);
      return;
    }

    // If neither is a type variable and they aren't equal, we have a type error
    console.error("typeA: %o\ntypeB: %o\nsubs: %o", a, b);
    throw new Error(`Cannot unify ${a} with ${b}`);
  });
}

function isTypeVar(typeExpr: ConstraintType): typeExpr is InferenceRequired {
  return (
    typeExpr.type === NodeType.InferenceRequired ||
    (typeExpr.type === NodeType.Identifier && typeExpr.name.startsWith("fn"))
  );
}
