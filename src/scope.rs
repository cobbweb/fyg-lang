use crate::ast::{TypeExpr, *};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq)]
enum ConstraintKind {
    Equality,
    Subset,
    PatternMatch,
}

#[derive(Debug, Clone, PartialEq)]
struct Constraint {
    lhs: TypeExpr,
    rhs: TypeExpr,
    kind: ConstraintKind,
}

#[derive(Debug, Clone, PartialEq)]
struct Scope {
    pub value_symbols: HashMap<String, ValueSymbol>,
    pub type_symbols: HashMap<String, TypeSymbol>,
    pub constraints: Vec<Constraint>,
    pub parent: Option<usize>,
    pub children: Vec<usize>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ValueSymbol {
    name: String,
    type_expr: TypeExpr,
    scope_index: usize,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TypeSymbol {
    name: String,
    type_expr: TypeExpr,
    scope_index: usize,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ScopeTree {
    pub scopes: Vec<Scope>,
    next_type_var: usize,
}

impl ScopeTree {
    pub fn new() -> Self {
        Self {
            scopes: vec![Scope {
                value_symbols: HashMap::new(),
                type_symbols: HashMap::new(),
                constraints: Vec::new(),
                parent: None,
                children: Vec::new(),
            }],
            next_type_var: 0,
        }
    }

    pub fn new_program_scope(&mut self) -> usize {
        self.new_child_scope(0)
    }

    pub fn new_child_scope(&mut self, parent_index: usize) -> usize {
        let child_index = self.scopes.len();
        let child = Scope {
            value_symbols: HashMap::new(),
            type_symbols: HashMap::new(),
            constraints: Vec::new(),
            parent: Some(parent_index),
            children: Vec::new(),
        };
        self.scopes.push(child);

        let parent = self.scopes.get_mut(parent_index);
        match parent {
            Some(parent) => parent.children.push(child_index),
            None => panic!("Could not find parent by index {}", parent_index),
        }

        child_index
    }

    pub fn push_constraint(&mut self, constraint: Constraint, scope_index: usize) {}

    pub fn bind_program(&mut self, program: Program) -> Program {
        let program_scope_index = self.new_program_scope();
        Program {
            scope: Some(program_scope_index),
            statements: program
                .statements
                .iter()
                .map(|stmt| -> TopLevelExpr {
                    match stmt {
                        TopLevelExpr::ConstDec(const_dec) => TopLevelExpr::ConstDec(
                            self.bind_const_dec(program_scope_index, const_dec.clone()),
                        ),
                        TopLevelExpr::TypeDec(type_dec) => TopLevelExpr::TypeDec(
                            self.bind_type_dec(program_scope_index, type_dec.clone()),
                        ),
                        TopLevelExpr::Expr(expr) => TopLevelExpr::Expr(
                            self.bind_expression(program_scope_index, expr.clone()),
                        ),
                        TopLevelExpr::EnumDec(_) => todo!(),
                        TopLevelExpr::ImportStatement {
                            module_name,
                            exposing,
                        } => todo!(),
                    }
                })
                .collect(),
            ..program
        }
    }

    pub fn bind_const_dec(&mut self, scope_index: usize, const_dec: ConstDec) -> ConstDec {
        let const_type = match const_dec.type_annotation.clone() {
            Some(type_expr) => type_expr,
            None => self.create_type_var(scope_index),
        };
        self.create_value_symbol(scope_index, const_dec.identifier.clone().name, const_type);

        ConstDec {
            value: Box::new(self.bind_expression(scope_index, *const_dec.value.clone())),
            identifier: const_dec.identifier.clone(),
            type_annotation: const_dec.type_annotation.clone(),
        }
    }

    pub fn bind_type_dec(&mut self, scope_index: usize, type_dec: TypeDec) -> TypeDec {
        self.create_type_symbol(
            scope_index,
            type_dec.clone().identifier.name,
            type_dec.clone().type_val,
        );
        if !type_dec.clone().type_vars.is_empty() {
            let type_dec_scope_index = self.new_child_scope(scope_index);
            for type_var in type_dec.clone().type_vars {
                self.create_type_symbol(
                    type_dec_scope_index,
                    type_var.name,
                    TypeExpr::InferenceRequired,
                );
            }
        }
        type_dec
    }

    pub fn bind_expression(&mut self, scope_index: usize, expr: Expr) -> Expr {
        match expr {
            Expr::ConstDec(const_dec) => {
                Expr::ConstDec(self.bind_const_dec(scope_index, const_dec))
            }
            Expr::TypeDec(type_dec) => Expr::TypeDec(self.bind_type_dec(scope_index, type_dec)),
            Expr::BlockExpression(exprs) => {
                let block_scope = self.new_child_scope(scope_index);
                Expr::BlockExpression(
                    exprs
                        .iter()
                        .map(|expr| -> Expr { self.bind_expression(block_scope, expr.clone()) })
                        .collect(),
                )
            }
            Expr::Binary(left, op, right) => Expr::Binary(
                Box::new(self.bind_expression(scope_index, *left)),
                op,
                Box::new(self.bind_expression(scope_index, *right)),
            ),
            Expr::Return(expr) => self.bind_expression(scope_index, *expr),
            Expr::Record(type_identifier, members) => Expr::Record(
                type_identifier,
                members
                    .iter()
                    .map(|m| ObjectMember {
                        key: m.clone().key,
                        value: self.bind_expression(scope_index, m.clone().value),
                    })
                    .collect(),
            ),
            Expr::Array(type_expr, exprs) => Expr::Array(
                type_expr,
                exprs
                    .iter()
                    .map(|expr| self.bind_expression(scope_index, expr.clone()))
                    .collect(),
            ),
            Expr::Call(expr, postfix_op) => Expr::Call(
                Box::new(self.bind_expression(scope_index, *expr)),
                match postfix_op {
                    PostfixOp::FunctionCall(args) => PostfixOp::FunctionCall(
                        args.iter()
                            .map(|expr| self.bind_expression(scope_index, expr.clone()))
                            .collect(),
                    ),
                    PostfixOp::IndexCall(_) => todo!(),
                    PostfixOp::GenericCall(_) => todo!(),
                    PostfixOp::DotCall(_) => todo!(),
                },
            ),
            Expr::Match(_subject, _clauses) => todo!(),
            Expr::IfElse(_, _, _) => todo!(),
            Expr::FunctionDefinition {
                parameters,
                return_type,
                body,
                scope: _,
            } => {
                let fn_scope_index = self.new_child_scope(scope_index);

                Expr::FunctionDefinition {
                    parameters: parameters
                        .iter()
                        .map(|p| -> FunctionParameter {
                            let param_type = p
                                .type_expr
                                .clone()
                                .unwrap_or(self.create_type_var(scope_index));
                            self.create_value_symbol(
                                fn_scope_index,
                                p.identifier.clone().name,
                                param_type.clone(),
                            );
                            FunctionParameter {
                                identifier: p.identifier.clone(),
                                type_expr: Some(param_type),
                            }
                        })
                        .collect(),
                    return_type: Some(return_type.unwrap_or(self.create_type_var(scope_index))),
                    body: Box::new(self.bind_expression(fn_scope_index, *body)),
                    scope: Some(fn_scope_index),
                }
            }

            // No scope operation required
            Expr::Number(_) => expr,
            Expr::String(_) => expr,
            Expr::Boolean(_) => expr,
            Expr::ValueReference(_) => expr,
            Expr::Void => expr,
        }
    }

    pub fn create_type_var(&mut self, scope_index: usize) -> TypeExpr {
        let inference_required = TypeExpr::InferenceRequired;
        let name = format!("t{}", self.next_type_var);
        self.next_type_var += 1;
        self.create_type_symbol(scope_index, name, inference_required.clone());

        inference_required
    }

    pub fn create_type_symbol(
        &mut self,
        scope_index: usize,
        identifier: String,
        type_expr: TypeExpr,
    ) -> &TypeSymbol {
        let existing = self.find_type_symbol(scope_index, identifier.clone());
        if existing.is_some() {
            panic!(
                "Cannot redeclare type symbol with name {}",
                identifier.clone()
            );
        }
        let scope = self
            .scopes
            .get_mut(scope_index)
            .expect("create_type_symbol: couldn't find scope by index");
        scope.type_symbols.insert(
            identifier.clone(),
            TypeSymbol {
                scope_index,
                name: identifier.clone(),
                type_expr,
            },
        );
        self.scopes[scope_index]
            .type_symbols
            .get(&identifier.clone())
            .expect("type symbol")
    }

    pub fn find_type_symbol(
        &mut self,
        scope_index: usize,
        identifier: String,
    ) -> Option<TypeSymbol> {
        let mut current_scope = self
            .scopes
            .get(scope_index)
            .expect("Scope with index should exist");

        loop {
            if let Some(symbol) = current_scope.type_symbols.get(&identifier) {
                return Some(symbol.clone());
            }

            match current_scope.parent {
                Some(parent_index) => {
                    current_scope = self
                        .scopes
                        .get(parent_index)
                        .expect("Parent scope with index should exist")
                }
                None => return None,
            }
        }
    }

    pub fn create_value_symbol(
        &mut self,
        scope_index: usize,
        identifier: String,
        type_expr: TypeExpr,
    ) -> &ValueSymbol {
        if self.find_value_symbol(scope_index, &identifier).is_some() {
            panic!("Cannot redeclare value symbol with name {}", identifier);
        }

        let scope = self
            .scopes
            .get_mut(scope_index)
            .expect("create_value_symbol: couldn't find scope by index");

        scope.value_symbols.insert(
            identifier.clone(),
            ValueSymbol {
                name: identifier.clone(),
                type_expr,
                scope_index,
            },
        );

        scope
            .value_symbols
            .get(&identifier)
            .expect("Recently added value symbol should be retrievable")
    }

    pub fn find_value_symbol(&self, scope_index: usize, identifier: &str) -> Option<ValueSymbol> {
        let mut current_scope = self
            .scopes
            .get(scope_index)
            .expect("Scope with index should exist");

        loop {
            if let Some(symbol) = current_scope.value_symbols.get(identifier) {
                return Some(symbol.clone());
            }

            match current_scope.parent {
                Some(parent_index) => {
                    current_scope = self
                        .scopes
                        .get(parent_index)
                        .expect("Parent scope with index should exist")
                }
                None => return None,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_scope_tree_contains_initial_scope() {
        let tree = ScopeTree::new();
        assert_eq!(
            tree.scopes.len(),
            1,
            "ScopeTree should start with one initial scope"
        );
    }

    #[test]
    fn new_child_scope_creates_and_links_scope_correctly() {
        let mut tree = ScopeTree::new();
        let parent_index = 0;
        let child_index = tree.new_child_scope(parent_index);

        assert_eq!(
            tree.scopes.len(),
            2,
            "ScopeTree should have two scopes after adding a child"
        );
        assert!(
            tree.scopes[parent_index].children.contains(&child_index),
            "Parent scope should contain new child index"
        );
        assert_eq!(
            tree.scopes[child_index].parent,
            Some(parent_index),
            "Child scope should have correct parent"
        );
    }

    #[test]
    fn find_type_symbol_in_current_scope() {
        let mut tree = ScopeTree::new();
        let type_expr = TypeExpr::TypeRef(TypeIdentifier {
            name: "True".to_string(),
            next_segment: None,
        });
        let identifier = "SomeType".to_string();
        tree.create_type_symbol(0, identifier.clone(), type_expr.clone());

        let symbol = tree
            .find_type_symbol(0, identifier.clone())
            .expect("Type symbol should be found");

        assert_eq!(
            symbol.name, identifier,
            "Found symbol should have the correct name"
        );
        assert_eq!(
            symbol.type_expr, type_expr,
            "Found symbol should have the correct type expression"
        );
    }

    #[test]
    #[should_panic(expected = "Cannot redeclare type symbol with name")]
    fn create_type_symbol_panics_on_redeclaration() {
        let mut tree = ScopeTree::new();
        let identifier = "SomeType".to_string();
        let type_expr = TypeExpr::Number;
        tree.create_type_symbol(0, identifier.clone(), type_expr.clone());

        // This should panic due to redeclaration
        tree.create_type_symbol(0, identifier.clone(), type_expr.clone());
    }

    #[test]
    fn find_type_symbol_searches_parent_scopes() {
        let mut tree = ScopeTree::new();
        let parent_scope_index = 0;
        let child_scope_index = tree.new_child_scope(parent_scope_index);

        let type_expr = TypeExpr::String;
        let identifier = "SomeType".to_string();
        tree.create_type_symbol(parent_scope_index, identifier.clone(), type_expr.clone());

        let symbol = tree
            .find_type_symbol(child_scope_index, identifier.clone())
            .expect("Type symbol should be found in parent scope");

        assert_eq!(
            symbol.name, identifier,
            "Found symbol in child scope should have the correct name"
        );
        assert_eq!(
            symbol.type_expr, type_expr,
            "Found symbol in child scope should have the correct type expression"
        );
    }

    #[test]
    fn create_value_symbol_adds_symbol_correctly() {
        let mut tree = ScopeTree::new();
        let scope_index = 0;
        let identifier = "value1".to_string();
        let type_expr = TypeExpr::String;

        tree.create_value_symbol(scope_index, identifier.clone(), type_expr.clone());

        assert!(
            tree.scopes[scope_index]
                .value_symbols
                .contains_key(&identifier),
            "Value symbol should be added to the scope"
        );
    }

    #[test]
    #[should_panic(expected = "Cannot redeclare value symbol with name")]
    fn create_value_symbol_panics_on_redeclaration() {
        let mut tree = ScopeTree::new();
        let scope_index = 0;
        let identifier = "value1".to_string();
        let type_expr = TypeExpr::String;

        // First declaration should succeed
        tree.create_value_symbol(scope_index, identifier.clone(), type_expr.clone());

        // Attempting to redeclare should panic
        tree.create_value_symbol(scope_index, identifier.clone(), type_expr.clone());
    }

    #[test]
    fn find_value_symbol_in_current_scope() {
        let mut tree = ScopeTree::new();
        let scope_index = 0;
        let identifier = "value1".to_string();
        let type_expr = TypeExpr::String;

        tree.create_value_symbol(scope_index, identifier.clone(), type_expr.clone());

        let symbol = tree
            .find_value_symbol(scope_index, &identifier)
            .expect("Value symbol should be found");

        assert_eq!(
            symbol.name, identifier,
            "Found symbol should have the correct name"
        );
        assert_eq!(
            symbol.type_expr, type_expr,
            "Found symbol should have the correct type expression"
        );
    }

    #[test]
    fn find_value_symbol_searches_parent_scopes() {
        let mut tree = ScopeTree::new();
        let parent_scope_index = 0;
        let child_scope_index = tree.new_child_scope(parent_scope_index);
        let identifier = "value1".to_string();
        let type_expr = TypeExpr::String;

        // Define symbol in parent scope
        tree.create_value_symbol(parent_scope_index, identifier.clone(), type_expr.clone());

        // Search for it in child scope
        let symbol = tree
            .find_value_symbol(child_scope_index, &identifier)
            .expect("Value symbol should be found in parent scope");

        assert_eq!(
            symbol.name, identifier,
            "Found symbol in child scope should have the correct name"
        );
        assert_eq!(
            symbol.type_expr, type_expr,
            "Found symbol in child scope should have the correct type expression"
        );
    }

    fn create_identifier(name: &str) -> Identifier {
        Identifier {
            name: name.to_string(),
        }
    }

    fn create_const_dec(name: &str, value: Expr, type_annotation: Option<TypeExpr>) -> ConstDec {
        ConstDec {
            identifier: create_identifier(name),
            type_annotation,
            value: Box::new(value),
        }
    }

    // Setup a basic test environment
    fn setup_test_program() -> Program {
        Program {
            module_name: vec!["TestModule".to_string()],
            statements: vec![
                TopLevelExpr::ConstDec(create_const_dec("x", Expr::Number("42".to_string()), None)),
                // Add more statements as needed for comprehensive tests
            ],
            scope: None,
        }
    }

    #[test]
    fn bind_const_dec_with_type_annotation() {
        let mut scope_tree = ScopeTree::new();
        let scope_index = scope_tree.new_program_scope();

        let const_dec = create_const_dec(
            "x",
            Expr::String("test".to_string()),
            Some(TypeExpr::String),
        );

        scope_tree.bind_const_dec(scope_index, const_dec);

        // Verify that a value symbol for 'x' is created in the scope with the correct type
        let value_symbol = scope_tree
            .find_value_symbol(scope_index, "x")
            .expect("Value symbol 'x' should exist");
        assert_eq!(value_symbol.type_expr, TypeExpr::String);
    }

    #[test]
    fn bind_const_dec_without_type_annotation() {
        let mut scope_tree = ScopeTree::new();
        let scope_index = scope_tree.new_program_scope();

        let const_dec = create_const_dec("y", Expr::Boolean(true), None);
        scope_tree.bind_const_dec(scope_index, const_dec);

        // Verify that 'y' is assigned a type var (assuming create_type_var generates a unique TypeExpr)
        let value_symbol = scope_tree
            .find_value_symbol(scope_index, "y")
            .expect("Value symbol 'y' should exist");
        match value_symbol.type_expr {
            TypeExpr::InferenceRequired => (), // Assuming this variant represents a type var
            _ => panic!("'y' should have an inference-required type expression"),
        }
    }

    #[test]
    fn test_bind_program_basic() {
        let mut scope_tree = ScopeTree::new(); // Assuming you have such a constructor
        let program = setup_test_program();

        let bound_program = scope_tree.bind_program(program);

        // Verify the scope is correctly set
        assert!(bound_program.scope.is_some());

        // Verify statements are correctly processed
        // This depends on your `bind_*` methods' implementations
        if let TopLevelExpr::ConstDec(const_dec) = &bound_program.statements[0] {
            assert_eq!(const_dec.identifier.name, "x");
            // Further assertions based on how `bind_const_dec` modifies `const_dec`
        } else {
            panic!("First statement should be a ConstDec");
        }

        // Add more assertions as needed to cover different statement types and binding logic
    }
}
