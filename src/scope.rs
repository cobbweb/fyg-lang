use crate::{
    ast::{TypeExpr, *},
    compiler::{CompilerError, ModuleMap},
};
use core::panic;
use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
};

#[derive(Debug, Clone, PartialEq)]
pub struct Scope {
    pub value_symbols: HashMap<String, ValueSymbol>,
    pub type_symbols: HashMap<String, TypeSymbol>,
    pub parent: Option<usize>,
    pub children: Vec<usize>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ValueSymbol {
    pub name: String,
    pub type_expr: TypeExpr,
    pub scope_index: usize,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TypeSymbol {
    pub name: String,
    pub type_expr: TypeExpr,
    pub scope_index: usize,
}

#[derive(Debug, Clone)]
pub struct ScopeTree {
    pub scopes: Vec<Scope>,
    module_map: Arc<RwLock<ModuleMap>>,
    next_type_var: usize,
    next_fn: usize,
}

impl ScopeTree {
    pub fn new(module_map: Arc<RwLock<ModuleMap>>) -> Self {
        Self {
            scopes: vec![Scope {
                value_symbols: HashMap::new(),
                type_symbols: HashMap::new(),
                parent: None,
                children: Vec::new(),
            }],
            module_map,
            next_type_var: 0,
            next_fn: 0,
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

    pub fn apply_substitutions(&mut self) {
        let mut updates = Vec::new();
        let scopes = self.scopes.clone();

        for (scope_index, scope) in scopes.iter().enumerate() {
            println!("applying in scope {}", scope_index);
            for (key, value) in &scope.value_symbols {
                let type_expr = &value.type_expr;
                let resolved_type = self.resolve_type(type_expr.clone(), scope_index);
                updates.push((scope_index, key, resolved_type))
            }
        }

        for (scope_index, key, resolved_type) in updates {
            if let Some(scope) = self.scopes.get_mut(scope_index) {
                if let Some(symbol) = scope.value_symbols.get_mut(key) {
                    symbol.type_expr = resolved_type;
                }
            }
        }
    }

    pub fn bind_program(&mut self, program: Program) -> Result<Program, CompilerError> {
        let program_scope_index = self.new_program_scope();
        for import in program.imports.clone() {
            self.process_import(program_scope_index, import);
        }

        Ok(Program {
            scope: Some(program_scope_index),
            imports: program.imports,
            statements: program
                .statements
                .iter()
                .map(|stmt| -> TopStatement {
                    match stmt {
                        TopStatement::ConstDec(const_dec) => TopStatement::ConstDec(
                            self.bind_const_dec(program_scope_index, const_dec.clone()),
                        ),
                        TopStatement::TypeDec(type_dec) => TopStatement::TypeDec(
                            self.bind_type_dec(program_scope_index, type_dec.clone()),
                        ),
                        TopStatement::Expr(expr) => TopStatement::Expr(
                            self.bind_expression(program_scope_index, expr.clone()),
                        ),
                        TopStatement::EnumDec(_) => todo!(),
                        TopStatement::ExternDec(extern_dec) => TopStatement::ExternDec(
                            self.bind_extern_dec(program_scope_index, extern_dec.clone()),
                        ),
                    }
                })
                .collect(),
            ..program
        })
    }

    fn bind_extern_dec(
        &mut self,
        scope_index: usize,
        extern_package: ExternPackage,
    ) -> ExternPackage {
        let extern_type = TypeExpr::ExternPackage {
            package_name: extern_package.clone().package_name,
            members: extern_package.clone().definitions,
        };
        self.create_value_symbol(
            scope_index,
            extern_package.clone().package_name,
            extern_type.clone(),
        );
        self.create_type_symbol(
            scope_index,
            TypeIdentifier {
                name: vec![extern_package.clone().package_name],
            },
            extern_type,
        );
        extern_package
    }

    pub fn process_import(&mut self, program_scope_index: usize, import: PackageImport) {
        let joined_name = import.package_name.join(".");
        let scope_name = import.aliased_name.unwrap_or(
            import
                .package_name
                .last()
                .expect("Imported module name")
                .clone(),
        );
        let module_indexes = {
            let module_map = self.module_map.read().expect("can read module_map");
            module_map
                .find_modules_by_name(joined_name.as_str())
                .expect("module should exist")
        };

        let type_expr = TypeExpr::ImportRef(joined_name, module_indexes);
        self.create_value_symbol(program_scope_index, scope_name, type_expr);
    }

    pub fn bind_const_dec(&mut self, scope_index: usize, const_dec: ConstDec) -> ConstDec {
        let const_type = match const_dec.type_annotation.clone() {
            Some(type_expr) => type_expr,
            None => self.create_type_var(scope_index),
        };
        self.create_value_symbol(scope_index, const_dec.identifier.clone().name, const_type);
        let value = self.bind_expression(scope_index, *const_dec.value.clone());

        ConstDec {
            value: Box::new(value),
            identifier: const_dec.identifier.clone(),
            type_annotation: const_dec.type_annotation.clone(),
        }
    }

    pub fn bind_type_dec(&mut self, scope_index: usize, type_dec: TypeDec) -> TypeDec {
        self.create_type_symbol(
            scope_index,
            type_dec.identifier.clone(),
            type_dec.clone().type_val,
        );
        if !type_dec.clone().type_vars.is_empty() {
            let type_dec_scope_index = self.new_child_scope(scope_index);
            for type_var in type_dec.clone().type_vars {
                self.create_type_symbol(
                    type_dec_scope_index,
                    type_var.clone(),
                    TypeExpr::InferenceRequired(Some(type_var)),
                );
            }
        }
        type_dec
    }

    pub fn bind_statement(&mut self, scope_index: usize, expr: BlockStatement) -> BlockStatement {
        match expr {
            BlockStatement::ConstDec(const_dec) => {
                BlockStatement::ConstDec(self.bind_const_dec(scope_index, const_dec))
            }
            BlockStatement::Return(expr) => {
                BlockStatement::Return(self.bind_expression(scope_index, expr))
            }
            BlockStatement::Expr(expr) => {
                BlockStatement::Expr(self.bind_expression(scope_index, expr))
            }
        }
    }

    pub fn bind_expression(&mut self, scope_index: usize, expr: Expr) -> Expr {
        match expr {
            Expr::BlockExpression(exprs, _) => {
                let block_scope = self.new_child_scope(scope_index);
                Expr::BlockExpression(
                    exprs
                        .iter()
                        .map(|statement| -> BlockStatement {
                            self.bind_statement(block_scope, statement.clone())
                        })
                        .collect(),
                    Some(block_scope),
                )
            }
            Expr::Binary(left, op, right) => Expr::Binary(
                Box::new(self.bind_expression(scope_index, *left)),
                op,
                Box::new(self.bind_expression(scope_index, *right)),
            ),
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
            Expr::DotCall(callee, member_identifier) => Expr::DotCall(
                Box::new(self.bind_expression(scope_index, *callee)),
                member_identifier,
            ),
            Expr::FunctionCall {
                callee,
                args,
                generic_args,
            } => Expr::FunctionCall {
                callee: Box::new(self.bind_expression(scope_index, *callee)),
                args: args
                    .iter()
                    .map(|arg| self.bind_expression(scope_index, arg.clone()))
                    .collect(),
                generic_args,
            },
            Expr::Match(_subject, _clauses) => todo!(),
            Expr::IfElse(_, _, _) => todo!(),
            Expr::FunctionDefinition {
                parameters,
                return_type,
                body,
                identifier,
                scope: _,
            } => {
                let fn_scope_index = self.new_child_scope(scope_index);
                let fn_identifier = identifier.unwrap_or_else(|| {
                    let name = format!("fn{}", self.next_fn);
                    self.next_fn += 1;
                    Identifier { name }
                });
                let bound_params: Vec<FunctionParameter> = parameters
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
                    .collect();

                let return_type = return_type.unwrap_or(self.create_type_var(scope_index));

                let fn_expr = Expr::FunctionDefinition {
                    parameters: bound_params.clone(),
                    return_type: Some(return_type.clone()),
                    body: Box::new(self.bind_expression(fn_scope_index, *body)),
                    scope: Some(fn_scope_index),
                    identifier: Some(fn_identifier.clone()),
                };

                let fn_type = TypeExpr::FunctionDefinition {
                    type_identifier: TypeIdentifier {
                        name: vec![fn_identifier.clone().name],
                    },
                    parameters: bound_params
                        .iter()
                        .map(|p| p.clone().type_expr.unwrap())
                        .collect(),
                    return_type: Box::new(return_type),
                };
                self.create_type_symbol(
                    scope_index,
                    TypeIdentifier {
                        name: vec![fn_identifier.name],
                    },
                    fn_type,
                );

                fn_expr
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
        let name = format!("t{}", self.next_type_var);
        let inference_required = TypeExpr::InferenceRequired(Some(TypeIdentifier {
            name: vec![name.clone()],
        }));
        self.next_type_var += 1;
        self.create_type_symbol(
            scope_index,
            TypeIdentifier { name: vec![name] },
            inference_required.clone(),
        );

        inference_required
    }

    pub fn create_type_symbol(
        &mut self,
        scope_index: usize,
        identifier: TypeIdentifier,
        type_expr: TypeExpr,
    ) -> &TypeSymbol {
        let joined_name = identifier.name.join(".");
        let existing = self.find_type_symbol(scope_index, identifier);
        if existing.is_some() {
            panic!(
                "Cannot redeclare type symbol with name {}",
                joined_name.clone()
            );
        }
        let scope = self
            .scopes
            .get_mut(scope_index)
            .expect("create_type_symbol: couldn't find scope by index");
        scope.type_symbols.insert(
            joined_name.clone(),
            TypeSymbol {
                scope_index,
                name: joined_name.clone(),
                type_expr,
            },
        );
        self.scopes[scope_index]
            .type_symbols
            .get(&joined_name.clone())
            .expect("type symbol")
    }

    pub fn update_type_symbol(
        &mut self,
        scope_index: usize,
        identifier: TypeIdentifier,
        type_expr: TypeExpr,
    ) {
        let joined_name = identifier.name.join(".");
        let mut current_scope = self
            .scopes
            .get_mut(scope_index)
            .expect("Scope should exist");

        while !current_scope
            .type_symbols
            .contains_key(joined_name.as_str())
        {
            if let Some(parent_index) = current_scope.parent {
                current_scope = self
                    .scopes
                    .get_mut(parent_index)
                    .expect("parent scope should exist");
            } else {
                println!("identifier: {:?} - scope: {}", joined_name, scope_index);
                panic!("got to root scope without finding symbol to update");
            }
        }

        let type_symbol = current_scope
            .type_symbols
            .get_mut(joined_name.as_str())
            .unwrap_or_else(|| panic!("Type {} should be in scope {}", joined_name, scope_index));

        type_symbol.type_expr = type_expr;
    }

    pub fn find_type_symbol(
        &self,
        scope_index: usize,
        identifier: TypeIdentifier,
    ) -> Option<TypeSymbol> {
        let joined_name = identifier.name.join(".");
        let mut current_scope = self
            .scopes
            .get(scope_index)
            .expect("Scope with index should exist");

        loop {
            if let Some(symbol) = current_scope.type_symbols.get(&joined_name) {
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

    /**
     * Handles situtations like
     * type Foo = String[]
     * type Haz = Foo
     * type Baz = Hoo
     *
     * The "resolved" type for Baz is String[]
     */
    pub fn resolve_type(&self, type_expr: TypeExpr, scope_index: usize) -> TypeExpr {
        match type_expr {
            TypeExpr::TypeRef(ref type_identifier)
            | TypeExpr::InferenceRequired(Some(ref type_identifier)) => {
                if let Some(type_symbol) =
                    self.find_type_symbol(scope_index, type_identifier.clone())
                {
                    let resolved_type = type_symbol.type_expr;
                    if resolved_type != type_expr {
                        // resolved type is different, so there's potential more steps to resolve
                        self.resolve_type(resolved_type.clone(), scope_index)
                    } else {
                        // type_expr can be resolved any further
                        resolved_type.clone()
                    }
                } else {
                    println!("no type symbol when trying to resolve type");
                    // Ported this from the old TS compiler but...
                    if let Some(scope) = self.scopes.get(scope_index) {
                        let parent = scope.parent.unwrap_or(0);
                        if parent != 0 {
                            // I don't understand the scope climbing?
                            return self.resolve_type(type_expr, parent);
                        }
                    }

                    type_expr
                }
            }
            _ => type_expr,
        }
    }

    pub fn scope_depth(&self, scope_index: usize) -> usize {
        let mut depth = 0;
        let mut current_scope = &self.scopes[scope_index];

        // Traverse up the tree, incrementing depth until the root is reached
        while let Some(parent_index) = current_scope.parent {
            current_scope = &self.scopes[parent_index];
            depth += 1;
        }

        depth
    }

    pub fn resolve_import_member_type(
        &self,
        module_name: String,
        member_name: Identifier,
    ) -> Option<TypeExpr> {
        let module_map = self.module_map.read().expect("can read module_map");
        let modules = module_map
            .find_modules_by_name(module_name.as_str())
            .expect("module by name");
        // Find the particular module that has the member_name
        // TODO: Scope is done by "Program" but should be by "Module"
        let resolved_module_index = modules.iter().find(|&&module_index| {
            let module = module_map.get_module(module_index);
            module.exports.iter().any(|export_iden| match export_iden {
                MixedIdentifier::TypeIdentifier(type_iden) => type_iden.name[0] == member_name.name,
                MixedIdentifier::Identifier(name) => *name == member_name,
            })
        });
        match resolved_module_index {
            Some(index) => {
                let resolved_module = module_map.get_module(*index);
                match &resolved_module.program {
                    Some(program) => {
                        let type_symbol = self
                            .find_value_symbol(
                                program.scope.expect("program scope"),
                                &member_name.name,
                            )
                            .expect("type symbol");
                        Some(type_symbol.type_expr)
                    }
                    None => None,
                }
            }
            None => None,
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
        let identifier = TypeIdentifier {
            name: vec!["True".to_string()],
        };
        let type_expr = TypeExpr::TypeRef(identifier);
        tree.create_type_symbol(0, identifier.clone(), type_expr.clone());

        let symbol = tree
            .find_type_symbol(0, identifier.clone())
            .expect("Type symbol should be found");

        assert_eq!(
            symbol.name,
            identifier.name.join("."),
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
        let identifier = TypeIdentifier {
            name: vec!["SomeType".to_string()],
        };
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
        let identifier = TypeIdentifier {
            name: vec!["SomeType".to_string()],
        };
        tree.create_type_symbol(parent_scope_index, identifier.clone(), type_expr.clone());

        let symbol = tree
            .find_type_symbol(child_scope_index, identifier.clone())
            .expect("Type symbol should be found in parent scope");

        assert_eq!(
            symbol.name,
            identifier.name.join("."),
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
            module_dec: ModuleDec {
                name: vec!["TestModule".to_string()],
                exports: vec![],
            },
            imports: vec![],
            statements: vec![
                TopStatement::ConstDec(create_const_dec("x", Expr::Number("42".to_string()), None)),
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
            TypeExpr::InferenceRequired(_) => (), // Assuming this variant represents a type var
            _ => self::panic!("'y' should have an inference-required type expression"),
        }
    }

    #[test]
    fn test_bind_program_basic() {
        let mut scope_tree = ScopeTree::new(); // Assuming you have such a constructor
        let program = setup_test_program();
        let bound_program = scope_tree.bind_program(program).expect("bound program");

        // Verify the scope is correctly set
        assert!(bound_program.scope.is_some());

        // Verify statements are correctly processed
        // This depends on your `bind_*` methods' implementations
        if let TopStatement::ConstDec(const_dec) = &bound_program.statements[0] {
            assert_eq!(const_dec.identifier.name, "x");
            // Further assertions based on how `bind_const_dec` modifies `const_dec`
        } else {
            self::panic!("First statement should be a ConstDec");
        }
    }
}
