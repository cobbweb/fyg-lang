use std::collections::HashMap;

use crate::{
    ast::{
        BinaryOp, BlockStatement, ConstDec, Expr, ExternMember, Identifier, MixedIdentifier,
        Program, TopStatement, TypeExpr,
    },
    scope::ScopeTree,
};

#[derive(Debug, Clone)]
pub struct CodeGenerator {
    package_name: String,
    imports: Vec<String>,
    top_level_stmts: Vec<String>,
    main_stmts: Vec<String>,
    program: Program,
    scope_tree: ScopeTree,
    import_map: HashMap<String, String>,
}

impl CodeGenerator {
    pub fn new(program: Program, scope_tree: ScopeTree) -> Self {
        CodeGenerator {
            package_name: program.module_dec.name.join("").to_lowercase(),
            imports: Vec::new(),
            top_level_stmts: Vec::new(),
            main_stmts: Vec::new(),
            program,
            scope_tree,
            import_map: HashMap::new(),
        }
    }

    pub fn generate_go(&mut self) -> String {
        if let Some(program_scope_index) = self.program.scope {
            for import in &self.program.imports {
                let last_segement = import
                    .package_name
                    .last()
                    .expect("last package name segment");
                let mut package_name = import.package_name.clone();
                package_name.insert(0, String::from("fygbuild"));
                let go_package_name = package_name.join("/").to_lowercase();
                if self.import_map.contains_key(last_segement) {
                    panic!(
                        "{} is already added to the go package names import map",
                        last_segement
                    );
                }
                self.import_map.entry(last_segement.to_string()).or_insert(
                    package_name
                        .last()
                        .expect("package name last")
                        .to_lowercase(),
                );
                self.imports.push(go_package_name)
            }
            for statement in &self.program.statements {
                match statement {
                    TopStatement::ConstDec(const_dec) => {
                        self.top_level_stmts
                            .push(self.generate_const_dec(const_dec, program_scope_index));
                    }
                    TopStatement::Expr(expr) => {
                        self.main_stmts
                            .push(self.generate_expr(expr, program_scope_index));
                    }
                    TopStatement::ExternDec(extern_dec) => {
                        self.imports.push(extern_dec.package_name.clone());
                    }
                    _ => {
                        panic!("Not implemented {:#?}", statement);
                    }
                }
            }
        }

        let mut final_source = format!("package {}\n\n", self.package_name);

        let imports_source = match self.imports.len() {
            0 => String::new(),
            1 => format!("import \"{}\"", self.imports[0]),
            _ => {
                let imports = self
                    .imports
                    .iter()
                    .map(|import| format!("\t\"{}\"", import))
                    .collect::<Vec<String>>()
                    .join("\n");
                format!(
                    "import (
{imports}
)"
                )
            }
        };
        final_source.push_str(&imports_source);
        final_source.push_str("\n\n");

        let top_level_stmts = self.top_level_stmts.join("\n\n");
        final_source.push_str(&top_level_stmts);
        final_source.push_str("\n\n");

        if !self.main_stmts.is_empty() {
            let main_stmts = self.main_stmts.join("\n\t");
            let main_fn = format!(
                "\n\nfunc main() {{
{main_stmts}
}}\n\n"
            );
            final_source.push_str(&main_fn);
        }

        final_source
    }

    fn generate_const_dec(&self, const_dec: &ConstDec, scope_index: usize) -> String {
        let value_symbol = self
            .scope_tree
            .find_value_symbol(scope_index, &const_dec.identifier.name)
            .expect("type symbol should exist");
        let const_value = *const_dec.value.clone();
        match const_value {
            Expr::FunctionDefinition {
                parameters,
                return_type,
                body,
                scope: Some(fn_scope),
                identifier,
            } => {
                let params: Vec<String> = parameters
                    .iter()
                    .map(|p| {
                        let resolved_param_type = self.scope_tree.resolve_type(
                            p.type_expr.clone().expect("type expr value"),
                            scope_index,
                        );

                        format!(
                            "{} {}",
                            self.generate_go_identifier(p.identifier.clone()),
                            self.primitive_type_conversion(resolved_param_type),
                        )
                    })
                    .collect();
                let return_type = self
                    .scope_tree
                    .resolve_type(return_type.expect("return_type"), scope_index);
                let rendered_body = match *body {
                    Expr::BlockExpression(exprs, Some(block_scope)) => {
                        let indent = self.indent(block_scope);
                        println!("indent: '{}'", indent);
                        let exprs_source = exprs
                            .iter()
                            .map(|stmt| match stmt {
                                BlockStatement::Expr(expr) => {
                                    format!("{}{}", indent, self.generate_expr(expr, block_scope))
                                }
                                BlockStatement::Return(expr) => {
                                    format!(
                                        "{}return {}",
                                        indent,
                                        self.generate_expr(expr, block_scope)
                                    )
                                }
                                BlockStatement::ConstDec(const_dec) => {
                                    format!(
                                        "{}{}",
                                        indent,
                                        self.generate_const_dec(const_dec, block_scope)
                                    )
                                }
                            })
                            .collect::<Vec<String>>()
                            .join("\n");
                        exprs_source
                    }
                    _ => {
                        let indent = self.indent(scope_index);
                        format!(
                            "  {}return {};",
                            indent,
                            self.generate_expr(&body, scope_index)
                        )
                    }
                };
                format!(
                    "func {}({}) {} {{\n{}\n}}",
                    self.generate_go_identifier(const_dec.identifier.clone()),
                    params.join(", "),
                    self.primitive_type_conversion(return_type),
                    rendered_body,
                )
            }
            _ => {
                let const_type = self.primitive_type_conversion(value_symbol.type_expr);
                format!(
                    "var {} {} = {};\n",
                    self.generate_go_identifier(const_dec.identifier.clone()),
                    const_type,
                    self.generate_expr(&const_dec.value, scope_index)
                )
            }
        }
    }

    fn primitive_type_conversion(&self, type_expr: TypeExpr) -> &str {
        match type_expr {
            TypeExpr::Number => "float64",
            TypeExpr::String => "string",
            TypeExpr::Void => "",
            _ => {
                println!("Codegen: unhandled type_expr to convert {:#?}", type_expr);
                todo!();
            }
        }
    }

    fn generate_go_identifier(&self, identifier: Identifier) -> String {
        let start = match identifier.name.as_str() {
            "double" => "fyg_double".to_string(),
            "bool" => "fyg_bool".to_string(),
            _ => identifier.name.clone(),
        };
        start.to_string()
    }

    fn generate_expr(&self, expr: &Expr, scope_index: usize) -> String {
        match expr {
            Expr::Number(number) => number.to_string(),
            Expr::String(string) => format!("\"{}\"", string),
            Expr::Binary(lhs, op, rhs) => {
                let op_str = match op {
                    BinaryOp::Add => "+",
                    BinaryOp::Subtract => "-",
                    BinaryOp::Multiply => "*",
                    BinaryOp::Divide => "/",
                    BinaryOp::Equal => "==",
                    BinaryOp::NotEqual => "!=",
                    BinaryOp::GreaterThan => ">",
                    BinaryOp::GreaterOrEqual => ">=",
                    BinaryOp::LessThan => "<",
                    BinaryOp::LessOrEqual => "<=",
                };
                format!(
                    "{} {} {}",
                    self.generate_expr(lhs, scope_index),
                    op_str,
                    self.generate_expr(rhs, scope_index)
                )
            }
            Expr::ValueReference(mixed_identifier) => match mixed_identifier {
                MixedIdentifier::Identifier(identifier) => {
                    self.generate_go_identifier(identifier.clone())
                }
                MixedIdentifier::TypeIdentifier(type_identifier) => {
                    println!("handled mixediden::typeiden {:#?}", type_identifier);
                    println!("codegen: {:#?}", self);
                    // type identifier here is probably a module import reference
                    self.import_map
                        .get(&type_identifier.name[0])
                        .unwrap_or_else(|| panic!("go package name from {:?}", type_identifier))
                        .to_string()
                }
            },
            Expr::FunctionCall {
                callee,
                args,
                generic_args: _,
            } => {
                let go_args: Vec<String> = args
                    .iter()
                    .map(|a| self.generate_expr(a, scope_index))
                    .collect();
                format!(
                    "{}({})",
                    self.generate_expr(callee, scope_index),
                    go_args.join(", ")
                )
            }
            Expr::DotCall(expr, identifier) => {
                let mut lhs = String::new();
                let mut rhs = String::new();

                if let Expr::ValueReference(MixedIdentifier::Identifier(iden)) = *expr.clone() {
                    let value_symbol = self
                        .scope_tree
                        .find_value_symbol(scope_index, iden.name.as_str())
                        .expect("could find value symbol");

                    if let TypeExpr::ExternPackage { members, .. } = value_symbol.type_expr {
                        let member = members
                            .iter()
                            .find(|&m| match m {
                                ExternMember::Function { local_name, .. }
                                | ExternMember::Variable { local_name, .. } => {
                                    *local_name == *identifier
                                }
                            })
                            .expect("Could not find member with that name");

                        match member {
                            ExternMember::Function { external_name, .. }
                            | ExternMember::Variable { external_name, .. } => {
                                lhs = self.generate_expr(expr, scope_index);
                                rhs = external_name.to_string();
                            }
                        }
                    }
                } else {
                    lhs = self.generate_expr(expr, scope_index);
                    rhs = self.generate_go_identifier(identifier.clone());
                }

                format!("{}.{}", lhs, rhs)
            }
            _ => {
                println!("Unhandled codegen expr {:#?}", expr);
                todo!()
            }
        }
    }

    fn indent(&self, scope_index: usize) -> String {
        let scope_depth = self.scope_tree.scope_depth(scope_index);
        let depth = if scope_depth > 0 { scope_depth - 1 } else { 0 };
        "  ".repeat(depth).to_string()
    }
}
