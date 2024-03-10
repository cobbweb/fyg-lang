#[derive(Debug, Clone, PartialEq)]
pub struct Program {
    pub module_name: String,
    pub statements: Vec<TopLevelExpr>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum TopLevelExpr {
    ConstDec(ConstDec),
    TypeDec(TypeDec),
}

#[derive(Debug, Clone, PartialEq)]
pub struct ConstDec {
    pub identifier: Identifier,
    pub value: Box<Expr>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Identifier {
    pub name: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct FunctionParameter {
    pub identifier: Identifier,
    pub type_expr: Option<TypeExpr>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum TypeExpr {
    TypeRef(TypeIdentifier),
    InferenceRequired,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TypeIdentifier {
    pub name: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TypeDec {
    pub identifier: TypeIdentifier,
    pub type_val: TypeExpr,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Expr {
    Number(String),
    String(String),
    Boolean(bool),
    ConstDec(ConstDec),
    FunctionDefinition {
        parameters: Vec<FunctionParameter>,
        return_type: Option<TypeExpr>,
        body: Box<Expr>,
    },
    ValueReference(Identifier),
    TypeDec(TypeDec),
    Void,
}

#[derive(Debug, Clone, PartialEq)]
pub enum BinaryOp {
    // Add(Box<Expr>, Box<Expr>),
    // Subtract(Box<Expr>, Box<Expr>),
    // Multiply(Box<Expr>, Box<Expr>),
    // Divide(Box<Expr>, Box<Expr>),
}
