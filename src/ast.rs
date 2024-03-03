#[derive(Debug)]
pub struct Program {
    pub module_name: String,
    pub statements: Vec<Statement>,
}

#[derive(Debug)]
pub enum Node {
    // Statement(Statement),
    // Expr(Expr),
    BasicType(BasicType),
    // BinaryOp(BinaryOp),
    Identifier(Identifier),
}

#[derive(Debug)]
pub enum Statement {
    ConstDeclaration(ConstDeclaration),
    // ExprStatement(Expr),
}

#[derive(Debug)]
pub struct ConstDeclaration {
    pub identifier: Identifier,
    pub value: Box<Node>,
}

#[derive(Debug)]
pub struct Identifier {
    pub name: String,
}

#[derive(Debug)]
pub struct FunctionDefinition {}

#[derive(Debug)]
pub struct FunctionParameter {
    pub identifer: Identifier,
    pub type_expr: TypeExpr,
}

#[derive(Debug)]
pub enum TypeExpr {
    // TypeReference(TypeIdentifier),
    // InferenceRequired,
}

#[derive(Debug)]
pub struct TypeIdentifier {
    pub name: String,
}

#[derive(Debug)]
pub enum Expr {
    // ConstDeclaration(Box<ConstDeclaration>),
    // BasicType(BasicType),
    // Binary(BinaryOp),
    // Identifier(Identifier),
}

#[derive(Debug)]
pub enum Boolean {
    True,
    False,
}

#[derive(Debug)]
pub enum BasicType {
    Number(String),
    String(String),
    Boolean(Boolean),
}

#[derive(Debug)]
pub enum BinaryOp {
    // Add(Box<Expr>, Box<Expr>),
    // Subtract(Box<Expr>, Box<Expr>),
    // Multiply(Box<Expr>, Box<Expr>),
    // Divide(Box<Expr>, Box<Expr>),
}
