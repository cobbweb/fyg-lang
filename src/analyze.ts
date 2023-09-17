import { deepEquals } from "bun";
import {
  Identifier,
  InferenceRequired,
  NodeType,
  Program,
  TypeExpression,
} from "./nodes";
import { ConstraintType, Constraints, Scope, Substitution } from "./scope";

export function analyzeProgram(program: Program) {
  if (!program.scope) throw new Error("Program must have scope created");
  if (!program.body) return;

  unifyScope(program.scope);
  // normalizeSubstitutions(program.scope);
  return program;
}

export function normalizeSubstitutions(scope: Scope) {}

// export function normalizeScope(
//   scope: Scope,
//   parentSubs: Substitution = new Map<ConstraintType, ConstraintType>()
// ) {
//   if (!scope.substitutions)
//     scope.substitutions = new Map<ConstraintType, ConstraintType>();
//
//   // Merge parent's substitutions into the current scope's substitutions
//   for (let [key, value] of parentSubs) {
//     if (!scope.substitutions.has(key)) {
//       scope.substitutions.set(key, value);
//     }
//   }
//
//   // Propagate substitutions for the current scope
//   scope.substitutions = propagateSubstitutions(scope.substitutions);
//
//   // Recursively propagate to child scopes
//   scope.children.forEach((childScope) =>
//     normalizeScope(childScope, scope.substitutions)
//   );
// }
//
// export function propagateSubstitutions(
//   substitution: Substitution
// ): Substitution {
//   let newSubsEntries: Array<[ConstraintType, ConstraintType]> = [];
//
//   const entries = Array.from(substitution);
//   const hasChanges = entries.some(([key, value]) => {
//     const directSubstitution = substitution.get(value);
//     const doChange =
//       directSubstitution && !deepEquals(value, directSubstitution);
//     const nextValue = doChange ? directSubstitution : value;
//     newSubsEntries.push([key, nextValue]);
//     return doChange;
//   });
//
//   const newSubstitution = new Map(newSubsEntries);
//
//   return hasChanges ? propagateSubstitutions(newSubstitution) : newSubstitution;
// }
//
// export function applyTypes(scope: Scope) {
//   Object.values(scope.value).forEach((value) => {
//     if (!value.type || !value.type.type) {
//       throw new Error("Value data is missing in scope");
//     }
//
//     if (value.type.type !== NodeType.InferenceRequired) return;
//
//     const inferredType = scope.substitutions.get(value.type);
//     if (!inferredType) {
//       console.log(scope);
//       throw new Error(`No inferred type found for ${value.name}`);
//     }
//
//     // mutate
//     value.type = inferredType;
//   });
//
//   scope.children.forEach((childScope) => applyTypes(childScope));
// }

export function unifyScope(scope: Scope, substitutions?: Substitution) {
  if (!scope.constraints)
    throw new Error(`Scope needs its constraints collected first`);

  scope.substitutions = unify(scope.constraints, substitutions);
  scope.children.forEach((childScope) =>
    unifyScope(childScope, new Map([...scope.substitutions]))
  );
}

export function unify(
  constraints: Constraints,
  substitution: Substitution = new Substitution()
): Substitution {
  return constraints.reduce((subs, [typeA, typeB]) => {
    const a = subs.get(typeA) || typeA;
    const b = subs.get(typeB) || typeB;
    if (deepEquals(a, b)) return subs;

    if (isTypeVar(a) && isTypeVar(b)) {
      subs.set(b, a);
      return subs;
    }

    if (isTypeVar(a)) {
      subs.set(a, b);
      return subs;
    }

    if (isTypeVar(b)) {
      subs.set(b, a);
      return subs;
    }

    // If neither is a type variable and they aren't equal, we have a type error
    console.error("typeA: %o\ntypeB: %o\nsubs: %o", a, b, subs);
    throw new Error(`Cannot unify ${a} with ${b}`);
  }, substitution);
}

function isTypeVar(typeExpr: ConstraintType): boolean {
  return (
    typeExpr.type === NodeType.InferenceRequired ||
    (typeExpr.type === NodeType.Identifier && typeExpr.name.startsWith("fn"))
  );
}
