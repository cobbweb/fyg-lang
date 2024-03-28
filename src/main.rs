use std::{env, io, path};

extern crate lazy_static;

mod analyze;
mod ast;
mod codegen;
mod compiler;
mod constraints;
mod lexer;
mod parser;
mod scope;

use crate::{
    compiler::{Compiler, CompilerError},
    parser::ParserError,
};

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
    let source_dirs = vec!["./src", "./stdlib"]
        .iter()
        .map(|s| s.to_string())
        .collect();
    let mut compiler = Compiler::new(source_dirs);
    let result = compiler.compile(args.file_path);

    match result {
        Ok(_success) => Ok(()),
        Err(compiler_error) => {
            match compiler_error {
                CompilerError::ParserError(ParserError {
                    message,
                    line_no,
                    col_no,
                }) => {
                    println!("Parser error {}:{}: {:#?}", line_no, col_no, message);
                }
                CompilerError::Other { message } => {
                    println!("{}", message);
                }
            }
            Ok(())
        }
    }
}
