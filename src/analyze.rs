use crate::{
    ast::TypeExpr,
    constraints::{Constraint, ConstraintKind},
    scope::ScopeTree,
};

#[derive(Clone, Debug, PartialEq)]
pub struct AnalyzeError {
    pub message: String,
    pub lhs: TypeExpr,
    pub rhs: TypeExpr,
}

type AnalyzeResult = Result<(), AnalyzeError>;

pub fn analyze_scope_tree(
    constraints: Vec<Constraint>,
    scope_tree: &mut ScopeTree,
) -> AnalyzeResult {
    for constraint in constraints {
        unify(constraint, scope_tree)?;
    }
    scope_tree.apply_substitutions();
    Ok(())
}

pub fn unify(constraint: Constraint, scope_tree: &mut ScopeTree) -> AnalyzeResult {
    println!(
        "\nConstraint ({}):\n{:#?}\n{}\n{:#?}",
        constraint.scope_index, constraint.lhs, constraint.kind, constraint.rhs
    );
    let resolve_left = scope_tree.resolve_type(constraint.clone().lhs, constraint.scope_index);
    let resolve_right = scope_tree.resolve_type(constraint.clone().rhs, constraint.scope_index);
    println!(
        "Resolved:\n{:#?}\n{}\n{:#?}\n\n",
        resolve_left, constraint.kind, resolve_right
    );

    match (resolve_left.clone(), resolve_right.clone()) {
        (TypeExpr::Number, TypeExpr::Number) => Ok(()),
        (TypeExpr::String, TypeExpr::String) => Ok(()),
        (TypeExpr::Void, TypeExpr::Void) => Ok(()),

        (TypeExpr::InferenceRequired(Some(type_iden)), _) => {
            println!(
                "Setting inferred type {} to {:?}",
                type_iden.clone().name.join("."),
                resolve_right.clone()
            );
            scope_tree.update_type_symbol(constraint.scope_index, type_iden, resolve_right.clone());
            Ok(())
        }

        (
            TypeExpr::FunctionDefinition {
                type_identifier: _left_type_identifier,
                parameters: left_params,
                return_type: left_return_type,
            },
            TypeExpr::FunctionDefinition {
                type_identifier: _right_type_identifer,
                parameters: right_params,
                return_type: right_return_type,
            },
        ) => {
            if left_params.len() != right_params.len() {
                return Err(AnalyzeError {
                    message: "Param counts don't match".to_string(),
                    lhs: resolve_left,
                    rhs: resolve_right,
                });
            }

            for (index, left_param) in left_params.iter().enumerate() {
                let right_param = right_params.get(index).expect("Right param at index");
                unify(
                    Constraint {
                        lhs: left_param.clone(),
                        rhs: right_param.clone(),
                        kind: ConstraintKind::Equality,
                        scope_index: constraint.scope_index,
                    },
                    scope_tree,
                )?
            }

            unify(
                Constraint {
                    lhs: *left_return_type,
                    rhs: *right_return_type,
                    kind: ConstraintKind::Equality,
                    scope_index: constraint.scope_index,
                },
                scope_tree,
            )?;
            Ok(())
        }

        // inverse of valid match, swap left and right sides
        (_, TypeExpr::InferenceRequired(Some(_))) => unify(
            Constraint {
                lhs: constraint.rhs,
                rhs: constraint.lhs,
                kind: constraint.kind,
                scope_index: constraint.scope_index,
            },
            scope_tree,
        ),

        (
            TypeExpr::FunctionCall {
                args,
                return_type: call_return_type,
                ..
            },
            TypeExpr::FunctionDefinition {
                parameters,
                return_type: def_return_type,
                ..
            },
        ) => {
            if args.len() != parameters.len() {
                return Err(AnalyzeError {
                    message: "Wrong amount of args provided".to_string(),
                    lhs: resolve_left,
                    rhs: resolve_right,
                });
            }

            for (index, arg) in args.iter().enumerate() {
                let param = parameters.get(index).expect("Right param at index");
                unify(
                    Constraint {
                        lhs: arg.clone(),
                        rhs: param.clone(),
                        kind: ConstraintKind::Equality,
                        scope_index: constraint.scope_index,
                    },
                    scope_tree,
                )?
            }

            unify(
                Constraint {
                    lhs: *call_return_type,
                    rhs: *def_return_type,
                    kind: ConstraintKind::Equality,
                    scope_index: constraint.scope_index,
                },
                scope_tree,
            )?;
            Ok(())
        }

        _ => Err(AnalyzeError {
            message: "Types don't match".to_string(),
            lhs: resolve_left,
            rhs: resolve_right,
        }),
    }
}
