use crate::ast::{self, Expr, FunctionParameter, TypeDec, TypeExpr, TypeIdentifier};
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

pub fn parse(input: &str) -> Result<ast::Program, String> {
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

fn convert_expr(pair: Pair<Rule>) -> ast::Expr {
    match pair.as_rule() {
        Rule::integer => Expr::Number(pair.as_str().parse().unwrap()),
        Rule::template_char => Expr::String(pair.as_str().parse().unwrap()),
        Rule::value_identifier => Expr::ValueReference(convert_identifer(pair)),
        Rule::boolean => {
            let bool = pair.as_str();
            match bool {
                "true" => Expr::Boolean(true),
                "false" => Expr::Boolean(false),
                _ => panic!("Error parsing 'boolean', expect a string value of 'true' or 'false'"),
            }
        }
        Rule::function_definition => {
            let mut inner_pairs = pair.into_inner().peekable();

            // Initialize parameters as empty, to be populated if any parameters are found
            let mut parameters: Vec<ast::FunctionParameter> = Vec::new();
            // Initialize return_type as None, to be set if a type_expression is found
            let mut return_type: Option<ast::TypeExpr> = None;
            // Placeholder for the function body expression
            let mut body_expr: Option<ast::Expr> = None;

            while let Some(next_pair) = inner_pairs.next() {
                print_pair("next fn def pair", next_pair.clone());
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
            }
        }
        Rule::type_declaration => {
            let mut inner_pairs = pair.into_inner();
            let type_identifier =
                convert_type_identifier(inner_pairs.next().expect("Expected type name"));
            let type_val = convert_type_expr(inner_pairs.next().expect("Expected type expression"));

            Expr::TypeDec(TypeDec {
                identifier: type_identifier,
                type_val,
            })
        }
        Rule::expression => {
            return convert_expr(pair.into_inner().next().expect("Expression"));
        }
        _ => {
            print_pair("Unhandled expr", pair);
            Expr::Void
        }
    }
}

fn convert_function_parameter(pair: Pair<Rule>) -> ast::FunctionParameter {
    print_pair("fp inner", pair.clone());
    let mut inner = pair.into_inner();
    let identifier = convert_identifer(inner.next().expect("Parameter name"));
    let type_expr = inner.next().map(convert_type_expr);

    FunctionParameter {
        identifier,
        type_expr,
    }
}

fn convert_type_expr(pair: Pair<Rule>) -> ast::TypeExpr {
    match pair.as_rule() {
        Rule::type_identifier => TypeExpr::TypeRef(convert_type_identifier(pair)),
        Rule::type_expression => {
            return convert_type_expr(pair.into_inner().next().expect("type expr"))
        }
        _ => {
            print_pair("Unhanled type expr", pair);
            TypeExpr::InferenceRequired
        }
    }
}

fn convert_type_identifier(pair: Pair<Rule>) -> ast::TypeIdentifier {
    if pair.as_rule() != Rule::type_identifier {
        panic!("Not a valid typename, got: {:?}", pair.as_rule())
    } else {
        let name = pair.as_str().to_string();
        TypeIdentifier { name }
    }
}

fn convert_identifer(pair: Pair<Rule>) -> ast::Identifier {
    match pair.as_rule() {
        Rule::identifier => ast::Identifier {
            name: pair.as_str().parse().unwrap(),
        },
        Rule::value_identifier => ast::Identifier {
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

fn convert_tree_to_program(pairs: Pairs<Rule>) -> ast::Program {
    let mut statements: Vec<ast::TopLevelExpr> = Vec::new();

    // Iterate through the pairs and recursively process each one
    for pair in pairs {
        match pair.as_rule() {
            // Ensure we're only processing top-level rules that should be converted to statements
            Rule::const_declaration => {
                let mut inner_pairs = pair.into_inner();
                let iden = inner_pairs.next().expect("identifier");
                let expr = inner_pairs.next().expect("expression");
                let const_dec = ast::ConstDec {
                    identifier: convert_identifer(iden),
                    value: Box::new(convert_expr(expr)),
                };

                statements.push(ast::TopLevelExpr::ConstDec(const_dec))
            }
            Rule::type_declaration => {
                let mut inner_pairs = pair.into_inner();
                let type_identifier =
                    convert_type_identifier(inner_pairs.next().expect("Expected type name"));
                let type_val =
                    convert_type_expr(inner_pairs.next().expect("Expected type expression"));

                statements.push(ast::TopLevelExpr::TypeDec(TypeDec {
                    identifier: type_identifier,
                    type_val,
                }));
            }
            Rule::module_declaration => {}
            Rule::EOI => {}
            // Optionally handle other top-level rules or skip them
            _ => {
                print_pair("unhanled program pair", pair);
                continue;
            }
        }
    }

    ast::Program {
        module_name: "Foo".to_string(), // This should probably be dynamically determined
        statements,
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
            // DATA TYPES
            ("create an single member object", "{ bar: `baz` }"),
            (
                "create a multi member object",
                "{ 
                    bar: `bar`,
                    age: 42,
                }",
            ),
            ("create an array", "[one, two, three, haha,]"),
            (
                "instantiate a record",
                "const andrew = User({ name: `Andrew`, status: `Total beast`, })",
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
            ("single import", "import Browser.Dom expose (fetch)"),
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
                    const four = 4
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
            ("declare simple generic box", "type Foo<T> = T"),
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
                assert!(false, "{}", result.unwrap_err());
            }
        }
    }
}
