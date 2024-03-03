use std::{env, fs, path};

extern crate lazy_static;

mod ast;
mod parser;
use parser::parse;

struct Cli {
    file_path: path::PathBuf,
}

fn main() {
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
    print!("{}", source);
    let parse_result = parse(&source);
    println!("{:#?}", parse_result);
}
