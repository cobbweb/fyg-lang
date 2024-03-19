use crate::ast::*;
use pest::error::{Error, ErrorVariant, LineColLocation};
use pest::{
    iterators::{Pair, Pairs},
    pratt_parser::PrattParser,
    Parser,
};
use pest_derive::Parser;

#[derive(Parser)]
#[grammar = "fyg.pest"]
pub struct FygParser;

fn inner_print_pair(pair: Pair<Rule>, indent_level: usize) {
    let indent = " ".repeat(indent_level * 2); // Creates an indentation string
    println!(
        "{}Rule: {:?}, Value: {:?}",
        indent,
        pair.as_rule(),
        pair.as_str()
    );
    for inner_pair in pair.into_inner() {
        inner_print_pair(inner_pair, indent_level + 1);
    }
}

fn print_pair(label: &str, pair: Pair<Rule>) {
    println!("{}", label);
    inner_print_pair(pair, 0);
}

lazy_static::lazy_static! {
    static ref PRATT_PARSER: PrattParser<Rule> = {
        use pest::pratt_parser::{Assoc::*, Op};
        use Rule::*;

        // Precedence is defined lowest to highest
        PrattParser::new()
            // Addition and subtract have equal precedence
            .op(Op::infix(add, Left) | Op::infix(subtract, Left))
            .op(Op::infix(multiply, Left) | Op::infix(divide, Left))
    };
}

pub fn parse(input: &str) -> Result<Program, String> {
    match FygParser::parse(Rule::program, input) {
        Ok(parse_tree) => {
            let program = convert_tree_to_program(parse_tree);
            Ok(program)
        }
        Err(e) => {
            let error_message = format_error(e);
            Err(error_message)
        }
    }
}

fn format_error(e: Error<Rule>) -> String {
    // Start building the error message
    let mut message = String::new();

    // Handle line and column information
    match &e.line_col {
        LineColLocation::Pos((line, column)) => {
            message.push_str(&format!(
                "Error occurred at line: {}, column: {}\n",
                line, column
            ));
        }
        LineColLocation::Span((start_line, start_column), (end_line, end_column)) => {
            message.push_str(&format!(
                "Error span starts at line: {}, column: {} and ends at line: {}, column: {}\n",
                start_line, start_column, end_line, end_column
            ));
        }
    }

    // Handle error variant details
    match &e.variant {
        ErrorVariant::ParsingError { positives, .. } => {
            // Map the `Rule`s to their string representation
            let expected_elements: Vec<String> =
                positives.iter().map(|rule| format!("{:?}", rule)).collect();
            message.push_str(&format!(
                "Expected one of the following: {:?}\n",
                expected_elements
            ));
        }
        _ => message.push_str("Encountered an unexpected error variant.\n"),
    }

    let line_content = e.line();
    if !line_content.is_empty() {
        message.push_str(&format!("Error line content: {}\n", line_content));
    }

    message
}

fn convert_expr(pair: Pair<Rule>) -> Expr {
    match pair.as_rule() {
        Rule::integer => Expr::Number(pair.as_str().parse().unwrap()),
        Rule::template_char => Expr::String(pair.as_str().parse().unwrap()),
        Rule::value_identifier => Expr::ValueReference(convert_identifer(pair)),
        Rule::identifier => Expr::ValueReference(convert_identifer(pair)),
        Rule::boolean => {
            let bool = pair.as_str();
            match bool {
                "true" => Expr::Boolean(true),
                "false" => Expr::Boolean(false),
                _ => panic!("Error parsing 'boolean', expect a string value of 'true' or 'false'"),
            }
        }
        Rule::const_declaration => Expr::ConstDec(convert_const_dec(pair)),
        Rule::function_definition => {
            let inner_pairs = pair.into_inner().peekable();

            // Initialize parameters as empty, to be populated if any parameters are found
            let mut parameters: Vec<FunctionParameter> = Vec::new();
            // Initialize return_type as None, to be set if a type_expression is found
            let mut return_type: Option<TypeExpr> = None;
            // Placeholder for the function body expression
            let mut body_expr: Option<Expr> = None;

            for next_pair in inner_pairs {
                match next_pair.as_rule() {
                    Rule::function_parameter => {
                        // If the rule matches function_parameters, process and add to parameters
                        parameters.push(convert_function_parameter(next_pair));
                    }
                    Rule::type_expression => {
                        // If the rule matches type_expression, set it as the return_type
                        return_type = Some(convert_type_expr(next_pair));
                    }
                    _ => {
                        // If it's neither, we assume we're at the body of the function
                        // Since the body is always expected, consume the rest as the body
                        body_expr = Some(convert_expr(next_pair));
                        break; // No need to continue after finding the body
                    }
                }
            }

            // Ensure body_expr is set
            let body_expr = body_expr.expect("Expected function body");

            Expr::FunctionDefinition {
                parameters,
                return_type,
                body: Box::new(body_expr),
                scope: None,
            }
        }
        Rule::object_expression => {
            let inner_pairs = pair.into_inner();
            let mut members: Vec<ObjectMember> = Vec::new();

            for member in inner_pairs {
                let mut member_inner = member.into_inner();
                let key_iden = convert_identifer(member_inner.next().expect("Member key"));
                let value = convert_expr(member_inner.next().expect("member value"));

                members.push(ObjectMember {
                    key: key_iden,
                    value,
                });
            }

            Expr::Record(None, members)
        }
        Rule::array_expression => {
            let inner_pairs = pair.into_inner();
            let items: Vec<Expr> = inner_pairs.map(convert_expr).collect();
            Expr::Array(TypeExpr::InferenceRequired, items)
        }
        Rule::record_expression => {
            let mut inner_pairs = pair.into_inner();
            let _record_type = convert_type_expr(inner_pairs.next().expect("Record type"));

            Expr::Void
        }
        Rule::type_declaration => Expr::TypeDec(convert_type_dec(pair)),
        Rule::expression => {
            return convert_expr(pair.into_inner().next().expect("Expression"));
        }
        Rule::block_expression => Expr::BlockExpression(
            pair.into_inner()
                .map(|s| {
                    return convert_expr(s.into_inner().next().expect("Expression"));
                })
                .collect(),
        ),
        Rule::binary_expression => {
            let mut inner_pairs = pair.clone().into_inner();
            let left_pair = inner_pairs.next().expect("Left side expression");
            let op_pair = inner_pairs.next().expect("Binary operator");
            let right_pair = inner_pairs.next().expect("Right side expression");

            let left = convert_expr(left_pair);
            let right = convert_expr(right_pair);
            let op = match op_pair.as_rule() {
                Rule::multiply => BinaryOp::Multiply,
                Rule::divide => BinaryOp::Divide,
                Rule::add => BinaryOp::Add,
                Rule::subtract => BinaryOp::Subtract,
                Rule::equal => BinaryOp::Equal,
                Rule::not_equal => BinaryOp::NotEqual,
                Rule::greater_than => BinaryOp::GreaterThan,
                Rule::greater_or_equal => BinaryOp::GreaterOrEqual,
                Rule::less_than => BinaryOp::LessThan,
                Rule::less_or_equal => BinaryOp::LessOrEqual,
                _ => {
                    print_pair("Unhandled binary op", pair.clone());
                    panic!("Unhandled binary op rule {:?}", pair.clone().as_rule())
                }
            };

            Expr::Binary(Box::new(left), op, Box::new(right))
        }
        Rule::call_expression => {
            let mut inner_pairs = pair.into_inner();
            let expr = convert_expr(inner_pairs.next().expect("Expression"));

            let postfix_pair = inner_pairs.next().expect("Postfix operator");
            let postfix_op = match postfix_pair.as_rule() {
                Rule::function_call_operator => PostfixOp::FunctionCall(Vec::new()),
                Rule::dot_operator => {
                    let iden_pair = postfix_pair.into_inner().next().expect("Identifier");
                    PostfixOp::DotCall(convert_identifer(iden_pair))
                }
                _ => {
                    print_pair("Unhandled postfix op", postfix_pair.clone());
                    panic!("Unhnalded postfix op {:?}", postfix_pair.as_rule());
                }
            };

            Expr::Call(Box::new(expr), postfix_op)
        }
        Rule::return_expression => {
            let expr = convert_expr(pair.into_inner().next().expect("Expression"));
            Expr::Return(Box::new(expr))
        }
        Rule::match_expression => {
            let mut inner_pairs = pair.clone().into_inner();
            let subject = convert_expr(inner_pairs.next().expect("Subject expression"));
            let body_pair = inner_pairs.next().expect("Match body");
            let clauses = body_pair
                .into_inner()
                .map(|c| {
                    let mut clause_inner_pairs = c.into_inner();
                    let pattern_expr = convert_expr(clause_inner_pairs.next().expect("Pattern"));
                    let clause_body = convert_expr(clause_inner_pairs.next().expect("Clause body"));

                    let pattern = match pattern_expr {
                        Expr::String(string) => Pattern::String(string),
                        Expr::Number(string) => Pattern::Number(string),
                        Expr::ValueReference(iden) => Pattern::ValueRef(iden),
                        _ => {
                            panic!("Unhnalded pattern {:?}", pattern_expr);
                        }
                    };

                    MatchClause {
                        pattern,
                        body: clause_body,
                    }
                })
                .collect();

            Expr::Match(Box::new(subject), clauses)
        }
        Rule::if_expression => {
            let mut inner_pairs = pair.into_inner();
            let condition = convert_expr(inner_pairs.next().expect("Condition expression"));
            let if_branch = convert_expr(inner_pairs.next().expect("if expression body"));
            let else_branch = convert_expr(inner_pairs.next().expect("else expression body"));

            Expr::IfElse(Box::new(condition), vec![if_branch], vec![else_branch])
        }
        _ => {
            print_pair("Unhandled expr", pair.clone());
            panic!("Unhnalded expr {:?}", pair.as_rule());
        }
    }
}

fn convert_function_parameter(pair: Pair<Rule>) -> FunctionParameter {
    let mut inner = pair.into_inner();
    let identifier = convert_identifer(inner.next().expect("Parameter name"));
    let type_expr = inner.next().map(convert_type_expr);

    FunctionParameter {
        identifier,
        type_expr,
    }
}

fn convert_type_dec(pair: Pair<Rule>) -> TypeDec {
    let mut inner_pairs = pair.into_inner();
    let type_identifier = convert_type_identifier(inner_pairs.next().expect("Expected type name"));
    let mut type_vars = Vec::new();
    while inner_pairs.peek().expect("Generic or expression").as_rule() == Rule::type_generic_param {
        let type_var_pair = inner_pairs.next().expect("Type var");
        let type_iden_pair = type_var_pair.into_inner().next().expect("type identifier");
        type_vars.push(convert_type_identifier(type_iden_pair.clone()));
    }
    let type_val = convert_type_expr(inner_pairs.next().expect("Expected type expression"));
    TypeDec {
        identifier: type_identifier,
        type_vars,
        type_val,
        scope: None,
    }
}

fn convert_type_expr(pair: Pair<Rule>) -> TypeExpr {
    match pair.as_rule() {
        Rule::type_identifier => TypeExpr::TypeRef(convert_type_identifier(pair)),
        Rule::type_expression => {
            return convert_type_expr(pair.into_inner().next().expect("type expr"))
        }
        Rule::segmented_type_identifier => TypeExpr::TypeRef(convert_type_identifier(pair)),
        Rule::type_object_expression => {
            let members = pair
                .into_inner()
                .map(|p| {
                    let mut members_pairs = p.into_inner();
                    let identifier =
                        convert_identifer(members_pairs.next().expect("Record type member name"));
                    let type_expr = convert_type_expr(
                        members_pairs.next().expect("Record member type expression"),
                    );
                    RecordTypeMemeber {
                        identifier,
                        type_expr,
                    }
                })
                .collect();
            TypeExpr::Record(members)
        }
        _ => {
            print_pair("Unhandled type expr", pair.clone());
            panic!("Unhandled type expr {:?}", pair.clone().as_rule());
        }
    }
}

fn convert_type_identifier(pair: Pair<Rule>) -> TypeIdentifier {
    let rule = pair.as_rule();
    if rule != Rule::type_identifier && rule != Rule::segmented_type_identifier {
        panic!("Not a valid type name, got: {:?}", rule)
    } else {
        let name = pair.as_str().to_string();
        TypeIdentifier {
            name,
            next_segment: None,
        }
    }
}

fn convert_identifer(pair: Pair<Rule>) -> Identifier {
    match pair.as_rule() {
        Rule::identifier => Identifier {
            name: pair.as_str().parse().unwrap(),
        },
        Rule::value_identifier => Identifier {
            name: pair.as_str().parse().unwrap(),
        },
        _ => {
            panic!(
                "Rule given to convert_identifier is not an identifier rule, got {}",
                pair
            )
        }
    }
}

fn convert_const_dec(pair: Pair<Rule>) -> ConstDec {
    let mut inner_pairs = pair.into_inner();
    let iden = inner_pairs.next().expect("identifier");
    let mut type_anno = None;

    let next_rule = inner_pairs.peek().expect("more pairs").as_rule();
    if next_rule == Rule::type_expression {
        let type_expr = inner_pairs
            .next()
            .expect("type expression for const annotation");
        type_anno = Some(convert_type_expr(type_expr));
    }

    let expr = inner_pairs.next().expect("expression");
    ConstDec {
        identifier: convert_identifer(iden),
        value: Box::new(convert_expr(expr)),
        type_annotation: type_anno,
    }
}

fn convert_tree_to_program(pairs: Pairs<Rule>) -> Program {
    let mut statements: Vec<TopLevelExpr> = Vec::new();
    let mut module_name: ModuleName = Vec::new();

    // Iterate through the pairs and recursively process each one
    for pair in pairs {
        match pair.as_rule() {
            // Ensure we're only processing top-level rules that should be converted to statements
            Rule::const_declaration => {
                let const_dec = convert_const_dec(pair);
                statements.push(TopLevelExpr::ConstDec(const_dec))
            }
            Rule::type_declaration => {
                statements.push(TopLevelExpr::TypeDec(convert_type_dec(pair)));
            }
            Rule::module_declaration => {
                let inner_pair = pair.into_inner().next().expect("module name");
                let iden_pairs = inner_pair.into_inner();
                for iden in iden_pairs {
                    module_name.push(iden.as_str().parse().expect("module name part"))
                }
            }
            Rule::import_statement => {
                let mut inner_pairs = pair.into_inner();
                let module_name_pair = inner_pairs.next().expect("Module name");
                let module_name: ModuleName = module_name_pair
                    .into_inner()
                    .map(|p| p.as_str().parse().expect("module part name"))
                    .collect();
                let mut exposing: Vec<MixedIdentifier> = Vec::new();
                for expose_pair in inner_pairs {
                    let iden = match expose_pair.as_rule() {
                        Rule::identifier => {
                            MixedIdentifier::Identifier(convert_identifer(expose_pair))
                        }
                        Rule::type_identifier => {
                            MixedIdentifier::TypeIdentifier(convert_type_identifier(expose_pair))
                        }
                        _ => panic!(
                            "Unexpected rule in import expose pairs: {:?}",
                            expose_pair.as_rule()
                        ),
                    };
                    exposing.push(iden);
                }

                statements.push(TopLevelExpr::ImportStatement {
                    module_name,
                    exposing,
                });
            }
            Rule::enum_declaration => {
                let mut inner_pair = pair.into_inner();
                let identifier =
                    convert_type_identifier(inner_pair.next().expect("Enum identifier"));
                let mut type_vars = Vec::new();

                while inner_pair.peek().expect("type vars").as_rule() == Rule::type_generic_param {
                    let type_var_pair = inner_pair.next().expect("type var param");
                    let type_iden_pair = type_var_pair
                        .into_inner()
                        .next()
                        .expect("type var identifier");
                    type_vars.push(convert_type_identifier(type_iden_pair));
                }

                let mut variants = Vec::new();
                for variant in inner_pair {
                    let mut variants_inner = variant.into_inner();
                    let variant_iden =
                        convert_type_identifier(variants_inner.next().expect("enum member iden"));
                    let mut variant_params = Vec::new();
                    for variant_param in variants_inner {
                        variant_params.push(convert_type_expr(variant_param));
                    }

                    variants.push(EnumVariant {
                        name: variant_iden,
                        params: variant_params,
                    });
                }

                statements.push(TopLevelExpr::EnumDec(EnumDec {
                    identifier,
                    type_vars,
                    variants,
                }));
            }
            Rule::expression => {
                let expr = convert_expr(pair);
                statements.push(TopLevelExpr::Expr(expr));
            }
            Rule::EOI => {}
            // Optionally handle other top-level rules or skip them
            _ => {
                print_pair("unhandled program pair", pair.clone());
                panic!("unhandled top level {:?}", pair.as_rule());
            }
        }
    }

    Program {
        module_name,
        statements,
        scope: None,
    }
}

#[cfg(test)]
mod test {
    use super::*;

    fn create_parse_tree(input: &str) -> Result<Pairs<Rule>, Error<Rule>> {
        FygParser::parse(Rule::program, input)
    }

    #[test]
    fn test_basic_parse() {
        let result = create_parse_tree("module Foo");
        assert!(result.is_ok());
    }

    #[test]
    fn test_multipart_module_name() {
        let result = create_parse_tree("module Foo.Bar.Baz");
        assert!(result.is_ok());
    }

    #[test]
    fn test_jumbo_syntax_does_parse() {
        let tests = [
            // BASICS
            ("empty program", ""),
            ("single line comment", "/* hello */"),
            ("multi line comment", "/* \n one \n two */"),
            ("integer", "4"),
            ("string", "`my string`"),
            ("postfix combo", "foo.bar<Baz>(cheeze)"),
            // DATA TYPES
            ("create an array", "[one, two, three, haha,]"),
            (
                "instantiate a record",
                "const andrew = User{ name: `Andrew`, status: `Total Beast` }",
            ),
            // FUNKY NEWLINES
            (
                "line break in const dec",
                "const foo =
                    bar",
            ),
            (
                "multiline array",
                "[one,
                    two  ,   three ,
                    four
                    , five,
                    ]",
            ),
            // IMPORT
            ("single import", "import Browser.Dom expose (fetch, header)"),
            ("expose as", "import Browser.Html expose as h"),
            (
                "big import",
                "import Browser expose (window, DomElement)
                 import Net.Http expose (Request, Response)
                 import Browser.Html expose as h
                 import Foo expose (bar)",
            ),
            // FUNCTION DEFINTIONS
            ("simple function", "() => {}"),
            ("function one param", "(x) => {}"),
            ("function two param", "(x, y) => {}"),
            (
                "function one param with type annotation",
                "(x: String) => {}",
            ),
            (
                "function two param with type annotation",
                "(x: String, y: Number) => {}",
            ),
            (
                "function mixed params",
                "(x, y: Number, z, bar: SomeType) => {}",
            ),
            (
                "multiline function body",
                "(x) => {
                    const two = 2
                    return x * four
                }",
            ),
            // FUNCTION CALL
            ("basic function call", "foobar()"),
            ("dot notation function call", "foo.bar()"),
            ("deep dot notation function call", "Baz.Bar.foo.bar()"),
            // BINARY EXPRESSIONS
            ("addition expression", "12 + 7"),
            ("multiplication expression", "12 * 7"),
            ("subtraction expression", "12 - 7"),
            ("division expression", "12 / 7"),
            ("equals expression", "12 == 7"),
            ("not equals expression", "12 != 7"),
            ("greater than expression", "12 > 7"),
            ("less than expression", "12 < 7"),
            // RECORDS
            ("simple record expression", "User({ name: `Andrew` })"),
            // TYPE DEFINITIONS
            ("simple type declaration", "type Foo = String"),
            (
                "declare a record type",
                "type User = { name: String, age: Number, }",
            ),
            ("declare simple generic box", "type Foo<F> = F"),
            (
                "declare a record type with a generic",
                "type Foo<T, Z> = { one: T, two: Z, }",
            ),
            ("declare a minimal enum", "enum Foo { Bar }"),
            ("declare a simple enum", "enum Foo { Bar(String) }"),
            (
                "declare a multi-member enum",
                "enum Foo { Bar(String), Baz(Number), Stan, }",
            ),
            (
                "declare a simple enum with generic",
                "enum Option<T> { Some(T), None, }",
            ),
            // MATCH EXPRESSIONS
            (
                "simple match expression",
                "match foo {
                    `foo` -> `bar`
                }",
            ),
            (
                "common match expression",
                "match response {
                    bar -> `bar`
                    baz -> `baz`
                }",
            ),
            // JUMBOTRON!
            (
                "jumbo test #1",
                "const foo = (x: Number): Number => if x > 10 { x * 2 } else { x * 5 }
                 const meaningOfLife = 50 - 8
                 const result = foo(meaningOfLife)",
            ),
        ];

        for (name, source) in tests {
            let moduled_source = format!("module Testing\n{}", source);
            let result = create_parse_tree(&moduled_source);
            if result.is_ok() {
                assert!(true, "{}", name);
            } else {
                panic!("{} {}", name, result.unwrap_err());
            }
        }
    }

    #[test]
    fn test_jumbo_convert_program() {
        let tests = [
            // BASICS
            ("empty program", ""),
            ("single line comment", "/* hello */"),
            ("multi line comment", "/* \n one \n two */"),
            ("integer", "4"),
            ("string", "`my string`"),
            // DATA TYPES
            ("create an array", "[one, two, three, haha,]"),
            (
                "instantiate a record",
                "const andrew = SomeModule.Baz.User{ name: `Andrew`, status: `Total beast`, }",
            ),
            // FUNKY NEWLINES
            (
                "line break in const dec",
                "const foo =
                    bar",
            ),
            (
                "multiline array",
                "[one,
                    two  ,   three ,
                    four
                    , five,
                    ]",
            ),
            // IMPORT
            ("single import", "import Browser.Dom expose (fetch, header)"),
            ("expose as", "import Browser.Html expose as h"),
            (
                "big import",
                "import Browser expose (window, DomElement)
                 import Net.Http expose (Request, Response)
                 import Browser.Html expose as h
                 import Foo expose (bar)",
            ),
            // IF/ELSE
            (
                "multine line if/else",
                "if foo == True {
                const bar = `it is true`
                println(bar)
            } else {
                const bar = `it is false`
                println(bar)
            }",
            ),
            // FUNCTION DEFINTIONS
            ("simple function", "() => {}"),
            ("function one param", "(x) => {}"),
            ("function two param", "(x, y) => {}"),
            (
                "function one param with type annotation",
                "(x: String) => {}",
            ),
            (
                "function two param with type annotation",
                "(x: String, y: Number) => {}",
            ),
            (
                "function mixed params",
                "(x, y: Number, z, bar: SomeType) => {}",
            ),
            (
                "multiline function body",
                "(x) => {
                    const two = 2
                    return x * four
                }",
            ),
            // FUNCTION CALL
            ("basic function call", "bar()"),
            ("dot notation function call", "foo.bar()"),
            ("deep dot notation function call", "Baz.Bar.foo.bar()"),
            // BINARY EXPRESSIONS
            ("addition expression", "12 + 7"),
            ("multiplication expression", "12 * 7"),
            ("subtraction expression", "12 - 7"),
            ("division expression", "12 / 7"),
            ("equals expression", "12 == 7"),
            ("not equals expression", "12 != 7"),
            ("greater than expression", "12 > 7"),
            ("less than expression", "12 < 7"),
            // TYPE DEFINITIONS
            ("simple type declaration", "type Foo = String"),
            (
                "declare a record type",
                "type User = { name: String, age: Number, }",
            ),
            ("declare simple generic box", "type Foo<F, G> = T"),
            (
                "declare a record type with a generic",
                "type Foo<T, Z> = { one: T, two: Z, }",
            ),
            (
                "declare a mega enum",
                "enum Foo<T> { Bar(String, T), Baz(Number), Gee, }",
            ),
            ("declare a minimal enum", "enum Foo { Bar }"),
            (
                "declare a multi-member enum",
                "enum Foo { Bar(String), Baz(Number), Stan, }",
            ),
            (
                "declare a simple enum with generic",
                "enum Option<T> { Some(T), None, }",
            ),
            // MATCH EXPRESSIONS
            (
                "simple match expression",
                "match foo {
                    `foo` -> `bar`
                }",
            ),
            (
                "common match expression",
                "match response {
                    bar -> `bar`
                    baz -> `baz`
                }",
            ),
            // JUMBOTRON!
            (
                "jumbo test #1",
                "const foo = (x: Number): Number => if x > 10 { x * 2 } else { x * 5 }
                 const meaningOfLife = 50 - 8
                 const result = foo(meaningOfLife)",
            ),
        ];

        for (name, source) in tests {
            let moduled_source = format!("module Testing.Foo\n{}", source);
            let result = parse(&moduled_source);
            if result.is_ok() {
                assert!(true, "{}", name);
            } else {
                panic!("{} {}", name, result.unwrap_err());
            }
        }
    }
}
