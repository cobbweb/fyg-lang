use core::fmt;
use core::panic;

use crate::{ast::*, scope::ScopeTree};

#[derive(Debug, Clone, PartialEq)]
pub enum ConstraintKind {
    Equality,
    Subset,
    PatternMatch,
}

impl fmt::Display for ConstraintKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConstraintKind::Equality => write!(f, "="),
            ConstraintKind::Subset => write!(f, "><"),
            ConstraintKind::PatternMatch => write!(f, "matches"),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Constraint {
    pub lhs: TypeExpr,
    pub rhs: TypeExpr,
    pub kind: ConstraintKind,
    pub scope_index: usize,
}

#[derive(Debug)]
pub struct ConstraintCollector<'a> {
    scope_tree: &'a mut ScopeTree,
    pub constraints: Vec<Constraint>,
}

impl<'a> ConstraintCollector<'a> {
    pub fn new(scope_tree: &'a mut ScopeTree) -> Self {
        ConstraintCollector {
            scope_tree,
            constraints: Vec::new(),
        }
    }

    pub fn push_constraint(&mut self, constraint: Constraint) {
        self.constraints.push(constraint);
    }

    pub fn collect_program(&mut self, program: Program) -> Program {
        let _: Vec<TypeExpr> = program
            .clone()
            .statements
            .iter()
            .map(|expr| match expr {
                TopStatement::ConstDec(const_dec) => {
                    self.collect_const_dec(const_dec.clone(), program.clone().scope.unwrap())
                }
                TopStatement::TypeDec(_) => todo!(),
                TopStatement::Expr(expr) => {
                    self.collect_expr(expr.clone(), program.clone().scope.unwrap())
                }
                TopStatement::EnumDec(_) => todo!(),
                TopStatement::ExternDec(extern_package) => {
                    self.collect_extern_dec(extern_package.clone(), program.clone().scope.unwrap())
                }
            })
            .collect();
        program
    }

    fn collect_statement(&mut self, statement: BlockStatement, parent_scope: usize) -> TypeExpr {
        match statement {
            BlockStatement::ConstDec(const_dec) => {
                self.collect_const_dec(const_dec.clone(), parent_scope)
            }
            BlockStatement::Return(expr) => self.collect_expr(expr, parent_scope),
            BlockStatement::Expr(expr) => self.collect_expr(expr.clone(), parent_scope),
        }
    }

    fn collect_extern_dec(&mut self, extern_dec: ExternPackage, parent_scope: usize) -> TypeExpr {
        // extern dec already has a fully fleshed out type in the scope tree
        // this is done during scope binding, lets just pull that out
        let type_symbol = self
            .scope_tree
            .find_type_symbol(
                parent_scope,
                TypeIdentifier {
                    name: vec![extern_dec.package_name],
                },
            )
            .expect("extern dec should already have type symbol from binding phase");

        type_symbol.type_expr
    }

    fn collect_const_dec(&mut self, const_dec: ConstDec, parent_scope: usize) -> TypeExpr {
        let name = const_dec.clone().identifier.name;
        let value_symbol = self
            .scope_tree
            .find_value_symbol(parent_scope, &name)
            .unwrap();
        let const_type = value_symbol.type_expr;
        let expr_type = self.collect_expr(*const_dec.clone().value, parent_scope);

        self.push_constraint(Constraint {
            lhs: const_type.clone(),
            rhs: expr_type,
            kind: ConstraintKind::Equality,
            scope_index: parent_scope,
        });

        const_type
    }

    fn collect_expr(&mut self, expr: Expr, parent_scope: usize) -> TypeExpr {
        match expr {
            Expr::Number(_) => TypeExpr::Number,
            Expr::String(_) => TypeExpr::String,
            Expr::Boolean(_) => TypeExpr::Boolean,
            Expr::FunctionDefinition {
                parameters: _,
                return_type: _return_type,
                body,
                scope: Some(fn_scope),
                identifier: Some(identifier),
            } => {
                println!("fn_name {:#?}", identifier.clone());
                let as_type_iden = TypeIdentifier {
                    name: vec![identifier.clone().name],
                };
                let fn_type_symbol = self
                    .scope_tree
                    .find_type_symbol(fn_scope, as_type_iden)
                    .expect("Error: expected fn_def type symbol");

                let return_type = match fn_type_symbol.clone().type_expr {
                    TypeExpr::FunctionDefinition { return_type, .. } => *return_type,
                    _ => panic!(
                        "Fn by name of {} is not a Function type in the symbol table",
                        identifier.name
                    ),
                };

                let body_returns = self.collect_expr(*body, fn_scope);
                self.push_constraint(Constraint {
                    lhs: return_type,
                    rhs: body_returns,
                    kind: ConstraintKind::Equality,
                    scope_index: fn_scope,
                });

                // need to ensure identifier is set before here?
                // bind_const_dec sets it, but what bout anonymous name?
                fn_type_symbol.type_expr
            }
            Expr::ValueReference(mixed_identifier) => {
                let iden_name = match mixed_identifier {
                    MixedIdentifier::Identifier(identifier) => identifier.clone().name,
                    MixedIdentifier::TypeIdentifier(type_identifier) => type_identifier
                        .clone()
                        .name
                        .first()
                        .expect("at least one name")
                        .to_string(),
                };
                println!(
                    "looking up value ref {} in scope {}",
                    iden_name, parent_scope
                );
                let value_symbol = self.scope_tree.find_value_symbol(parent_scope, &iden_name);
                if value_symbol.is_none() {
                    panic!("Could not find {:?} in socpe", iden_name);
                }
                value_symbol.unwrap().type_expr
            }
            // Expr::TypeDec(type_dec) => {
            //     let type_symbol = self
            //         .scope_tree
            //         .find_type_symbol(parent_scope, type_dec.identifier.name);
            //
            //     type_symbol.unwrap().type_expr
            // }
            Expr::Record(_, _) => todo!(),
            Expr::Array(array_type, exprs) => {
                for expr in exprs {
                    let expr_type = self.collect_expr(expr.clone(), parent_scope);
                    self.push_constraint(Constraint {
                        lhs: array_type.clone(),
                        rhs: expr_type,
                        kind: ConstraintKind::Equality,
                        scope_index: parent_scope,
                    })
                }
                array_type
            }
            Expr::BlockExpression(statements, scope_index) => {
                let block_scope = scope_index.unwrap();
                let returned_exprs: Vec<TypeExpr> = statements
                    .iter()
                    .filter_map(|statement| match statement {
                        BlockStatement::Return(expr) => {
                            Some(self.collect_expr(expr.clone(), block_scope))
                        }
                        BlockStatement::ConstDec(const_dec) => {
                            // this is yuck? fix mutation in filter_map
                            let _ = self.collect_const_dec(const_dec.clone(), block_scope);
                            None
                        }
                        BlockStatement::Expr(expr) => {
                            // this is yuck? fix mutation in filter_map
                            let _ = self.collect_expr(expr.clone(), block_scope);
                            None
                        }
                    })
                    .collect();
                let last_return = returned_exprs.last().unwrap_or(&TypeExpr::Void);
                for returned_expr in returned_exprs.clone() {
                    if returned_expr != *last_return {
                        self.push_constraint(Constraint {
                            lhs: last_return.clone(),
                            rhs: returned_expr,
                            kind: ConstraintKind::Equality,
                            scope_index: block_scope,
                        })
                    }
                }
                last_return.clone()
            }
            Expr::Void => TypeExpr::Void,
            Expr::Binary(left, _op, right) => {
                let left_type = self.collect_expr(*left, parent_scope);
                let right_type = self.collect_expr(*right, parent_scope);
                self.push_constraint(Constraint {
                    lhs: left_type.clone(),
                    rhs: right_type.clone(),
                    kind: ConstraintKind::Equality,
                    scope_index: parent_scope,
                });
                let push_numbers_constraint = |return_type| {
                    self.push_constraint(Constraint {
                        lhs: TypeExpr::Number,
                        rhs: left_type,
                        kind: ConstraintKind::Equality,
                        scope_index: parent_scope,
                    });
                    self.push_constraint(Constraint {
                        lhs: TypeExpr::Number,
                        rhs: right_type,
                        kind: ConstraintKind::Equality,
                        scope_index: parent_scope,
                    });
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
            Expr::DotCall(callee, member_identifier) => {
                let callee_type = self.collect_expr(*callee, parent_scope);
                let resolved_callee_type = self
                    .scope_tree
                    .resolve_type(callee_type.clone(), parent_scope);

                match resolved_callee_type {
                    TypeExpr::ExternPackage {
                        package_name,
                        members,
                    } => {
                        let member_search = members.iter().find(|&member| match member {
                            ExternMember::Function { local_name, .. } => {
                                *local_name == member_identifier
                            }
                            ExternMember::Variable { local_name, .. } => {
                                *local_name == member_identifier
                            }
                        });

                        match member_search {
                            Some(member) => match &member {
                                ExternMember::Function {
                                    local_name,
                                    external_name: _,
                                    parameters,
                                    return_type,
                                } => {
                                    let type_identifier = TypeIdentifier {
                                        name: vec![package_name, local_name.clone().name],
                                    };
                                    let params_types = parameters
                                        .iter()
                                        .map(|p| p.type_expr.clone().unwrap())
                                        .collect();

                                    TypeExpr::FunctionDefinition {
                                        type_identifier,
                                        parameters: params_types,
                                        return_type: Box::new(return_type.clone()),
                                    }
                                }
                                ExternMember::Variable {
                                    local_name,
                                    external_name,
                                    value_type,
                                } => todo!(),
                            },
                            None => {
                                panic!("Cannot call {} on {}", member_identifier.name, package_name)
                            }
                        }
                    }
                    TypeExpr::ImportRef(name, module_indexes) => {
                        println!("name: {}", name);
                        println!("module_indexes: {:#?}", module_indexes);
                        self.scope_tree
                            .resolve_import_member_type(name.clone(), member_identifier.clone())
                            .unwrap_or_else(|| {
                                panic!("can resolve {}.{}", name, member_identifier.name)
                            })
                    }
                    _ => {
                        panic!(
                            "Unhandled dotcall type {:#?} /endunhandled",
                            resolved_callee_type
                        );
                    }
                }
            }
            Expr::FunctionCall {
                callee,
                args,
                generic_args: _,
            } => {
                let callee_type = self.collect_expr(*callee, parent_scope);
                let resolved_type = self
                    .scope_tree
                    .resolve_type(callee_type.clone(), parent_scope);

                let already_resolves_to_fn = matches!(
                    resolved_type,
                    TypeExpr::FunctionDefinition { .. } | TypeExpr::FunctionCall { .. }
                );

                let return_type = self.scope_tree.create_type_var(parent_scope);
                let fn_call_type = TypeExpr::FunctionCall {
                    args: args
                        .iter()
                        .map(|arg| self.collect_expr(arg.clone(), parent_scope))
                        .collect(),
                    return_type: Box::new(return_type.clone()),
                    callee: Box::new(callee_type.clone()),
                };

                if already_resolves_to_fn {
                    self.push_constraint(Constraint {
                        lhs: fn_call_type,
                        rhs: resolved_type,
                        kind: ConstraintKind::Equality,
                        scope_index: parent_scope,
                    });
                } else {
                    let identifier = match resolved_type.clone() {
                        TypeExpr::TypeRef(type_identifier)  => type_identifier.clone(),
                        TypeExpr::InferenceRequired(Some(type_identifier)) => type_identifier.clone(),
                        _ => panic!("Expected fn call resolved type to be a TypeIdentifier or InferferenceRequired(Some(TypeIdentifier)). Got {:#?}", resolved_type.clone()),
                    };
                    // existing fn expression is resolving to something like fn1
                    // lets infer a function def based on the call type
                    let fn_def_type = TypeExpr::FunctionDefinition {
                        type_identifier: identifier,
                        parameters: args
                            .iter()
                            .map(|a| self.collect_expr(a.clone(), parent_scope))
                            .collect(),
                        return_type: Box::new(return_type.clone()),
                    };

                    self.push_constraint(Constraint {
                        lhs: resolved_type,
                        rhs: fn_def_type,
                        kind: ConstraintKind::Equality,
                        scope_index: parent_scope,
                    })
                }

                return_type
            }
            Expr::Match(_, _) => todo!(),
            Expr::IfElse(condition, true_branch, false_branch) => {
                let condition_type = self.collect_expr(*condition, parent_scope);
                let true_branch_type = self.collect_expr(*true_branch, parent_scope);
                let false_branch_type = self.collect_expr(*false_branch, parent_scope);

                self.push_constraint(Constraint {
                    lhs: condition_type,
                    rhs: TypeExpr::Boolean,
                    kind: ConstraintKind::Equality,
                    scope_index: parent_scope,
                });
                self.push_constraint(Constraint {
                    lhs: true_branch_type.clone(),
                    rhs: false_branch_type,
                    kind: ConstraintKind::Equality,
                    scope_index: parent_scope,
                });
                true_branch_type
            }
            Expr::FunctionDefinition { .. } => panic!("Fn def has something missing"),
        }
    }
}
