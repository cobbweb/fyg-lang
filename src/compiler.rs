use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::{Arc, RwLock},
};

use glob::glob;

use crate::{
    analyze::analyze_scope_tree,
    ast::{MixedIdentifier, Program},
    codegen::CodeGenerator,
    constraints::ConstraintCollector,
    lexer::Lexer,
    parser::{Parser, ParserError},
    scope::ScopeTree,
};

#[derive(Debug, Clone, PartialEq)]
pub struct Module {
    parser: Parser,
    pub path: PathBuf,
    pub module_name: String,
    pub exports: Vec<MixedIdentifier>,
    pub program: Option<Program>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ModuleMap {
    modules: Vec<Module>,
    index_by_name: HashMap<String, Vec<usize>>,
    index_by_path: HashMap<PathBuf, usize>,
}

impl ModuleMap {
    pub fn new() -> Self {
        ModuleMap {
            modules: Vec::new(),
            index_by_name: HashMap::new(),
            index_by_path: HashMap::new(),
        }
    }

    pub fn add_module(&mut self, module: Module) {
        let index = self.modules.len();
        self.modules.push(module);

        self.index_by_name
            .entry(self.modules[index].module_name.clone())
            .or_insert_with(Vec::new)
            .push(index);

        self.index_by_path
            .insert(self.modules[index].path.clone(), index);
    }

    pub fn get_module_mut(&mut self, index: usize) -> &mut Module {
        &mut self.modules[index]
    }

    pub fn get_module(&self, index: usize) -> &Module {
        self.modules.get(index).expect("module should exist")
    }

    pub fn find_module_by_path(&self, path: &PathBuf) -> Option<usize> {
        self.index_by_path.get(path).copied()
    }

    pub fn find_modules_by_name(&self, name: &str) -> Option<Vec<usize>> {
        self.index_by_name.get(name).cloned()
    }
}

#[derive(Debug, Clone)]
pub enum CompilerError {
    ParserError(ParserError),
    Other { message: String },
}

pub struct CompilerSuccess;

pub struct Compiler {
    module_map: Arc<RwLock<ModuleMap>>,
    errors: Vec<CompilerError>,
    scope_tree: ScopeTree,
}

impl Compiler {
    pub fn new(source_dirs: Vec<String>) -> Self {
        let mut errors = Vec::new();
        let module_map = Arc::new(RwLock::new(match Compiler::build_module_map(source_dirs) {
            Ok(module_map) => module_map,
            Err(compiler_error) => {
                errors.push(compiler_error);
                ModuleMap::new()
            }
        }));
        let scope_tree = ScopeTree::new(Arc::clone(&module_map));
        println!("Errors: {:#?}", errors);
        Compiler {
            module_map,
            errors,
            scope_tree,
        }
    }

    /**
     * Given our source directories
     * Create a HashMap of ModuleName => Module
     */
    fn build_module_map(source_dirs: Vec<String>) -> Result<ModuleMap, CompilerError> {
        let mut module_map = ModuleMap::new();

        for src_dir in source_dirs {
            let pattern = format!("{}/**/*.fyg", src_dir);
            println!("Loading fyg files from: {}", pattern.clone());
            let globules = glob(pattern.as_str()).map_err(|_err| CompilerError::Other {
                message: format!("Error globbing with {}", pattern),
            })?;

            for entry in globules {
                let path = entry.map_err(|_err| CompilerError::Other {
                    message: "Error get path from globule".to_string(),
                })?;
                println!("Found file: {}", path.clone().display());
                let module = Compiler::build_module_from_filepath(path)?;

                module_map.add_module(module);
            }
        }
        Ok(module_map)
    }

    pub fn compile(&mut self, entry_file_path: PathBuf) -> Result<CompilerSuccess, CompilerError> {
        println!("starting compiler");
        if Path::new("./build").exists() {
            println!("clearing build dir/");
            fs::remove_dir_all("./build").expect("Failed to remove build dir");
        }
        fs::create_dir_all("./build").expect("Failed to create build dir");
        println!("Writing go.mod file");
        fs::write("./build/go.mod", "module fygbuild").expect("Can write go.mod");

        let entry_module_index = {
            let mut module_map = self.module_map.write().expect("can write module_map");
            if module_map.find_module_by_path(&entry_file_path).is_none() {
                module_map.add_module(Compiler::build_module_from_filepath(
                    entry_file_path.clone(),
                )?);
            }
            module_map.find_module_by_path(&entry_file_path).unwrap()
        };

        self.process_module(entry_module_index)?;

        Ok(CompilerSuccess)
    }

    pub fn find_modules_by_name(&mut self, name: &str) -> Option<Vec<usize>> {
        let module_map = self
            .module_map
            .read()
            .expect("module map should be readable");
        module_map.find_modules_by_name(name)
    }

    pub fn process_module(&mut self, module_index: usize) -> Result<(), CompilerError> {
        let program = {
            let mut module_map = self.module_map.write().expect("can write module_map");
            let module = module_map.get_module_mut(module_index);
            module.parser.reset();
            let parsed_program = module.parser.parse().map_err(CompilerError::ParserError)?;
            println!("parsed program:\n{:#?}", parsed_program);
            parsed_program
        };

        for import in program.imports.clone() {
            let joined_name = import.package_name.join(".");
            match self.find_modules_by_name(joined_name.as_str()) {
                Some(imported_module_indices) => {
                    for import_index in imported_module_indices {
                        self.process_module(import_index)?;
                        println!("found module processed");
                    }
                }
                None => {
                    return Err(CompilerError::Other {
                        message: format!("No module found named {}", joined_name),
                    });
                }
            };
        }

        let bound_program = self.scope_tree.bind_program(program)?;
        let mut constraints_collector = ConstraintCollector::new(&mut self.scope_tree);
        let collected_program = constraints_collector.collect_program(bound_program);
        println!("===program===\n{:#?}\n===", collected_program);
        let analyze_result =
            analyze_scope_tree(constraints_collector.constraints, &mut self.scope_tree);

        if analyze_result.is_ok() {
            let mut module_map = self
                .module_map
                .write()
                .expect("can get write lock on module_map");
            let module = module_map.get_module_mut(module_index);
            module.program = Some(collected_program.clone());

            let mut code_gen =
                CodeGenerator::new(collected_program.clone(), self.scope_tree.clone());
            let go_code = code_gen.generate_go();
            println!("Go Program:\n------\n{}\n------", go_code.clone());
            let go_filename = format!(
                "./build/{}.go",
                module.module_name.to_lowercase().replace('.', "/")
            );
            let go_file_basepath = Path::new(go_filename.as_str())
                .parent()
                .expect("no basepath");
            fs::create_dir_all(go_file_basepath).expect("Create build src dir");
            fs::write(go_filename.clone(), go_code)
                .unwrap_or_else(|_| panic!("Cannot write to {}", go_filename));
        } else {
            panic!("Error: {:#?}", analyze_result.unwrap_err());
        }

        Ok(())
    }

    fn build_module_from_filepath(path: PathBuf) -> Result<Module, CompilerError> {
        let source_code =
            fs::read_to_string(path.clone()).map_err(|_err| CompilerError::Other {
                message: format!("Could not read file {}", path.display()),
            })?;
        let mut lexer = Lexer::new(source_code);
        let tokens = lexer.tokenize();
        let mut parser = Parser::new(tokens);
        let module_dec = parser
            .parse_get_module_dec()
            .map_err(CompilerError::ParserError)?;

        let joined_module_name = module_dec.name.join(".");
        Ok(Module {
            path,
            parser,
            module_name: joined_module_name,
            exports: module_dec.exports,
            program: None,
        })
    }
}
