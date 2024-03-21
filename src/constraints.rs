use crate::{
    ast::*,
    scope::{Constraint, ConstraintKind, ScopeTree},
};

pub struct ConstraintCollector {
    scope_tree: ScopeTree,
}

impl ConstraintCollector {
    pub fn new(scope_tree: ScopeTree) -> Self {
        ConstraintCollector { scope_tree }
    }

    pub fn collect_program(&mut self, program: Program) -> Program {
        let _ = program.clone().statements.iter().map(|expr| match expr {
            TopLevelExpr::ConstDec(const_dec) => {
                self.collect_const_dec(const_dec.clone(), program.clone().scope.unwrap())
            }
            TopLevelExpr::TypeDec(_) => todo!(),
            TopLevelExpr::Expr(expr) => {
                self.collect_expr(expr.clone(), program.clone().scope.unwrap())
            }
            TopLevelExpr::EnumDec(_) => todo!(),
            TopLevelExpr::ImportStatement {
                module_name,
                exposing,
            } => todo!(),
        });
        program
    }

    fn collect_const_dec(&mut self, const_dec: ConstDec, parent_scope: usize) -> TypeExpr {
        let name = const_dec.clone().identifier.name;
        let value_symbol = self
            .scope_tree
            .find_value_symbol(parent_scope, &name)
            .unwrap();
        let const_type = value_symbol.type_expr;
        let expr_type = self.collect_expr(*const_dec.clone().value, parent_scope);

        self.scope_tree.push_constraint(
            Constraint {
                lhs: const_type.clone(),
                rhs: expr_type,
                kind: ConstraintKind::Equality,
            },
            parent_scope,
        );

        const_type
    }

    fn collect_expr(&mut self, expr: Expr, parent_scope: usize) -> TypeExpr {
        match expr {
            Expr::Number(_) => TypeExpr::Number,
            Expr::String(_) => TypeExpr::String,
            Expr::Boolean(_) => TypeExpr::Boolean,
            Expr::ConstDec(const_dec) => self.collect_const_dec(const_dec, parent_scope),
            Expr::FunctionDefinition {
                parameters,
                return_type,
                body,
                scope,
                identifier,
            } => {
                // need to ensure identifier is set before here?
                // bind_const_dec sets it, but what bout anonymous name?
                TypeExpr::Void
            }
            Expr::ValueReference(identifier) => {
                let value_symbol = self
                    .scope_tree
                    .find_value_symbol(parent_scope, &identifier.clone().name);
                value_symbol.unwrap().type_expr
            }
            Expr::TypeDec(type_dec) => {
                let type_symbol = self
                    .scope_tree
                    .find_type_symbol(parent_scope, type_dec.identifier.name);

                type_symbol.unwrap().type_expr
            }
            Expr::Record(_, _) => todo!(),
            Expr::Array(array_type, exprs) => {
                for expr in exprs {
                    let expr_type = self.collect_expr(expr.clone(), parent_scope);
                    self.scope_tree.push_constraint(
                        Constraint {
                            lhs: array_type.clone(),
                            rhs: expr_type,
                            kind: ConstraintKind::Equality,
                        },
                        parent_scope,
                    )
                }
                array_type
            }
            Expr::BlockExpression(exprs, scope_index) => {
                let block_scope = scope_index.unwrap();
                let returned_exprs: Vec<TypeExpr> = exprs
                    .iter()
                    .filter_map(|expr| match expr {
                        Expr::Return(expr) => Some(self.collect_expr(*expr.clone(), block_scope)),
                        _ => {
                            let _ = self.collect_expr(expr.clone(), block_scope);
                            None
                        }
                    })
                    .collect();
                let last_return = returned_exprs.last().unwrap_or(&TypeExpr::Void);
                for returned_expr in returned_exprs.clone() {
                    if returned_expr != *last_return {
                        self.scope_tree.push_constraint(
                            Constraint {
                                lhs: last_return.clone(),
                                rhs: returned_expr,
                                kind: ConstraintKind::Equality,
                            },
                            block_scope,
                        )
                    }
                }
                last_return.clone()
            }
            Expr::Void => TypeExpr::Void,
            Expr::Return(expr) => self.collect_expr(*expr, parent_scope),
            Expr::Binary(left, _op, right) => {
                let left_type = self.collect_expr(*left, parent_scope);
                let right_type = self.collect_expr(*right, parent_scope);
                self.scope_tree.push_constraint(
                    Constraint {
                        lhs: left_type.clone(),
                        rhs: right_type.clone(),
                        kind: ConstraintKind::Equality,
                    },
                    parent_scope,
                );
                let push_numbers_constraint = |return_type| {
                    self.scope_tree.push_constraint(
                        Constraint {
                            lhs: TypeExpr::Number,
                            rhs: left_type,
                            kind: ConstraintKind::Equality,
                        },
                        parent_scope,
                    );
                    self.scope_tree.push_constraint(
                        Constraint {
                            lhs: TypeExpr::Number,
                            rhs: right_type,
                            kind: ConstraintKind::Equality,
                        },
                        parent_scope,
                    );
                    return_type
                };
                match _op {
                    BinaryOp::Add => push_numbers_constraint(TypeExpr::Number),
                    BinaryOp::Subtract => push_numbers_constraint(TypeExpr::Number),
                    BinaryOp::Multiply => push_numbers_constraint(TypeExpr::Number),
                    BinaryOp::Divide => push_numbers_constraint(TypeExpr::Number),
                    BinaryOp::Equal => TypeExpr::Boolean,
                    BinaryOp::NotEqual => TypeExpr::Boolean,
                    BinaryOp::GreaterThan => push_numbers_constraint(TypeExpr::Boolean),
                    BinaryOp::GreaterOrEqual => push_numbers_constraint(TypeExpr::Boolean),
                    BinaryOp::LessThan => push_numbers_constraint(TypeExpr::Boolean),
                    BinaryOp::LessOrEqual => push_numbers_constraint(TypeExpr::Boolean),
                }
            }
            Expr::Call(expr, postfix) => todo!(),
            Expr::Match(_, _) => todo!(),
            Expr::IfElse(condition, true_branch, false_branch) => {
                let condition_type = self.collect_expr(*condition, parent_scope);
                let true_branch_type = self.collect_expr(*true_branch, parent_scope);
                let false_branch_type = self.collect_expr(*false_branch, parent_scope);

                self.scope_tree.push_constraint(
                    Constraint {
                        lhs: condition_type,
                        rhs: TypeExpr::Boolean,
                        kind: ConstraintKind::Equality,
                    },
                    parent_scope,
                );
                self.scope_tree.push_constraint(
                    Constraint {
                        lhs: true_branch_type.clone(),
                        rhs: false_branch_type,
                        kind: ConstraintKind::Equality,
                    },
                    parent_scope,
                );
                true_branch_type
            }
        }
    }
}
