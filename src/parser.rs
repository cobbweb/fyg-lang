use crate::ast::{self, BasicType, Boolean, Node};
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
    if line_content.len() > 0 {
        message.push_str(&format!("Error line content: {}\n", line_content));
    }

    message
}

fn convert_pair_to_ast_node(pair: Pair<Rule>) -> Node {
    match pair.as_rule() {
        Rule::integer => Node::BasicType(BasicType::Number(pair.as_str().parse().unwrap())),
        Rule::template_char => Node::BasicType(BasicType::String(pair.to_string())),
        Rule::value_identifier => Node::Identifier(ast::Identifier {
            name: pair.as_str().parse().unwrap(),
        }),
        Rule::boolean => {
            let bool = pair.as_str();
            match bool {
                "true" => Node::BasicType(BasicType::Boolean(Boolean::True)),
                "false" => Node::BasicType(BasicType::Boolean(Boolean::False)),
                _ => panic!("Error parsing 'boolean', expect a string value of 'true' or 'false'"),
            }
        }
        Rule::function_definition => {
            println!("{:#?}", pair.into_inner());
            Node::BasicType(BasicType::Number("0".to_string())) // Placeholder, handle appropriately
        }
        Rule::expression => convert_pair_to_ast_node(pair.into_inner().next().expect("Inner pair")),
        // ... handle other rules here ...
        _ => {
            println!("Unhandled rule: {:#?}", pair.as_rule());
            Node::BasicType(BasicType::Number("0".to_string())) // Placeholder, handle appropriately
        }
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
    let mut statements: Vec<ast::Statement> = Vec::new();

    // Iterate through the pairs and recursively process each one
    for pair in pairs {
        match pair.as_rule() {
            // Ensure we're only processing top-level rules that should be converted to statements
            Rule::const_declaration => {
                let mut inner_pairs = pair.into_inner();
                let iden = inner_pairs.next().expect("identifier");
                let expr = inner_pairs.next().expect("expression");
                let const_dec = ast::ConstDeclaration {
                    identifier: convert_identifer(iden),
                    value: Box::new(convert_pair_to_ast_node(expr)),
                };

                statements.push(ast::Statement::ConstDeclaration(const_dec))

                // Process each inner pair
                // for inner_pair in inner_pairs {
                //     let node = convert_pair_to_ast_node(inner_pair.clone());
                //     println!("{:#?}", inner_pair);
                //     match node {
                //         ast::Node::Expr(expr) => {
                //             statements.push(ast::Statement::ExprStatement(expr))
                //         }
                //         _ => panic!("Top level should only contain statements, got {:#?}", node),
                //     }
                // }
            }
            Rule::module_declaration => {}
            // Optionally handle other top-level rules or skip them
            _ => {
                println!("other rule: {:#?}", pair);
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
