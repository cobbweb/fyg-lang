use crate::{ast::*, scope::ScopeTree};

pub struct ConstraintCollector {
    scope_tree: ScopeTree,
}

impl ConstraintCollector {
    fn collect_program(&mut self, program: Program) -> Program {
        Program {
            module_name: program.clone().module_name,
            scope: program.clone().scope,
            statements: program
                .clone()
                .statements
                .iter()
                .map(|expr| match expr {
                    TopLevelExpr::ConstDec(const_dec) => TopLevelExpr::ConstDec(
                        self.collect_const_dec(const_dec.clone(), program.scope.clone().unwrap()),
                    ),
                    TopLevelExpr::TypeDec(_) => todo!(),
                    TopLevelExpr::Expr(_) => todo!(),
                    TopLevelExpr::EnumDec(_) => todo!(),
                    TopLevelExpr::ImportStatement {
                        module_name,
                        exposing,
                    } => todo!(),
                })
                .collect(),
        }
    }

    fn collect_const_dec(&mut self, const_dec: ConstDec, parent_scope: usize) -> ConstDec {
        let name = const_dec.clone().identifier.name;
    }
}
