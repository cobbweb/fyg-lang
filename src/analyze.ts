import { deepEquals } from "bun";
import { InferenceRequired, NodeType, Program, TypeExpression } from "./nodes";
import {
  ConstraintType,
  Scope,
  dumpScope,
  findTypeSymbol,
  updateTypeSymbol,
} from "./scope";
import { dumpNode } from "./ast";

export function analyzeProgram(program: Program) {
  if (!program.scope) throw new Error("Program must have scope created");
  if (!program.body) return;

  // unify constraints back in the type table
  unifyScope(program.scope);
  // resolve the RHS of type variables so all types are resolved
  applySubstitutions(program.scope);
  // apply type info back to the value table
  applyTypesToValueTable(program.scope);
  // manually check final type issues
  validateScope(program.scope);
  return program;
}

export function applyTypesToValueTable(scope: Scope) {
  // mutates
  Object.values(scope.value).forEach((valueSymbol) => {
    const { type } = valueSymbol;
    if (!("name" in type)) return;

    const resolvedSymbol = findTypeSymbol(type.name!, scope);
    if (!resolvedSymbol) {
      console.log(dumpNode(type));
      console.error(
        // @ts-ignore
        `Could not resolve type name ${type?.name} for ${valueSymbol.name}`
      );
      return;
    }

    valueSymbol.type = resolvedSymbol.type;
  });

  scope.children.forEach((childScope) => applyTypesToValueTable(childScope));
}

export function validateScope(scope: Scope, errors: string[] = []): string[] {
  const valueSymbols = Object.values(scope.value);

  valueSymbols.forEach((valueSymbol) => {
    switch (valueSymbol.type.type) {
      case NodeType.FunctionCallType:
    }
  });

  return errors;
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
        // CALLEE
        const startCallee = typeExpression.callee;
        const fnExpr =
          typeExpression.callee.type !== NodeType.FunctionType
            ? substitutionSearch(typeExpression.callee, scope)
            : startCallee;

        typeExpression.callee = fnExpr ?? startCallee;
        const calleeChanged = !deepEquals(startCallee, fnExpr);

        if (typeExpression.callee.type !== NodeType.FunctionType)
          throw new Error(
            `fn callee did not resolve to a FunctionType, got ${
              NodeType[typeExpression.callee.type]
            }`
          );

        // ARGUMENTS
        const argsChanged = typeExpression.arguments.some((arg, i) => {
          const subVal = substitutionSearch(arg, scope);
          typeExpression.arguments[i] = subVal ?? arg;
          return !!subVal;
        });

        // RETURN TYPES
        const startReturnType = typeExpression.returnType;
        // check if the return type as already been inferred
        if (startReturnType.type === NodeType.InferenceRequired) {
          const { callee } = typeExpression;
          console.log("returnType needs inferring");

          const unwrappedNewReturnType =
            callee.returnType.type === NodeType.TypeAnnotation
              ? callee.returnType.expression
              : callee.returnType;

          if (unwrappedNewReturnType.type !== NodeType.InferenceRequired) {
            typeExpression.returnType = unwrappedNewReturnType;
            updateTypeSymbol(typeVarName, typeExpression, scope);
          }
        }

        const returnTypeChanged = typeExpression.returnType !== startReturnType;
        return argsChanged || returnTypeChanged || calleeChanged;
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

  const foundSymbol = scope.type[name];
  if (foundSymbol) {
    const foundTypeExpression = foundSymbol.type;
    // is the resolved type _another_ identifier, do a deeper search
    return "name" in foundTypeExpression && foundTypeExpression.name !== name
      ? substitutionSearch(foundTypeExpression, scope)
      : foundTypeExpression;
  }

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
    // unwrap TypeReference nodes
    typeA = typeA.type === NodeType.TypeReference ? typeA.identifier : typeA;
    typeB = typeB.type === NodeType.TypeReference ? typeB.identifier : typeB;

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
    console.error("typeA: %o\ntypeB: %o\nsubs: %o", dumpNode(a), dumpNode(b));
    throw new Error(`Cannot unify ${a} with ${b}`);
  });
}

function isTypeVar(typeExpr: ConstraintType): typeExpr is InferenceRequired {
  return (
    typeExpr.type === NodeType.InferenceRequired ||
    (typeExpr.type === NodeType.Identifier && typeExpr.name.startsWith("fn"))
  );
}
