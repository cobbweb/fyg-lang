#[derive(Debug, Clone, PartialEq)]
pub struct Program {
    pub module_name: String,
    pub statements: Vec<TopLevelExpr>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum TopLevelExpr {
    ConstDec(ConstDec),
    TypeDec(TypeDec),
    Expr(Expr),
}

#[derive(Debug, Clone, PartialEq)]
pub struct ConstDec {
    pub identifier: Identifier,
    pub type_annotation: Option<TypeExpr>,
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
    pub next_segment: Option<Box<TypeIdentifier>>,
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
    RecordExpr(Option<TypeIdentifier>, Vec<ObjectMember>),
    ArrayExpr(TypeExpr, Vec<Expr>),
    BlockExpression(Vec<Expr>),
    Void,
    ReturnExpr(Box<Expr>),
    BinaryExpr(Box<Expr>, BinaryOp, Box<Expr>),
    CallExpr(Box<Expr>, PostfixOp),
    MatchExpr(Box<Expr>, Vec<MatchClause>),
    IfElseExpr(Box<Expr>, Vec<Expr>, Vec<Expr>),
}

#[derive(Debug, Clone, PartialEq)]
pub struct ObjectExpr {}

#[derive(Debug, Clone, PartialEq)]
pub struct ObjectMember {
    pub key: Identifier,
    pub value: Expr,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MatchClause {
    pub pattern: Pattern,
    pub body: Expr,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Pattern {
    String(String),
    Number(String),
    Boolean(bool),
    ValueRef(Identifier),
}

#[derive(Debug, Clone, PartialEq)]
pub enum BinaryOp {
    Add,
    Subtract,
    Multiply,
    Divide,
    Equal,
    NotEqual,
    GreaterThan,
    GreaterOrEqual,
    LessThan,
    LessOrEqual,
}

#[derive(Debug, Clone, PartialEq)]
pub enum PostfixOp {
    FunctionCall(Vec<Expr>),
    IndexCall(Box<Expr>),
    GenericCall(TypeExpr),
    DotCall(Identifier),
}
