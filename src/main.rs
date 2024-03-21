use std::{
    env,
    fs::{self},
    io::{self},
    path::{self},
};

extern crate lazy_static;

mod ast;
mod constraints;
mod lexer;
mod parser;
mod scope;

use constraints::ConstraintCollector;
use parser::parse;
use scope::ScopeTree;

struct Cli {
    file_path: path::PathBuf,
}

fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();

    // Check if we have enough arguments
    if args.len() < 3 {
        eprintln!("Usage: fyg <file_path>");
        std::process::exit(1);
    }

    // Assuming the file path is the last argument
    let file_path = &args[args.len() - 1];
    println!("File path provided: {}", file_path);

    let args = Cli {
        file_path: path::PathBuf::from(file_path.clone()),
    };
    let source = fs::read_to_string(args.file_path).expect("Should have been a valid file");
    let parse_result = parse(&source);

    let program = parse_result.unwrap();
    let mut scope_tree = ScopeTree::new();
    let bound_program = scope_tree.bind_program(program);
    println!("Program\n{:#?}", bound_program);
    let mut constraints_collector = ConstraintCollector::new(scope_tree);
    let collected_program = constraints_collector.collect_program(bound_program);

    Ok(())
}
