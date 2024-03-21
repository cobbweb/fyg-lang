#[derive(Debug, Clone, PartialEq)]
pub struct Program {
    pub module_name: ModuleName,
    pub statements: Vec<TopLevelExpr>,
    pub scope: Option<usize>,
}

pub type ModuleName = Vec<String>;

#[derive(Debug, Clone, PartialEq)]
pub enum TopLevelExpr {
    ConstDec(ConstDec),
    TypeDec(TypeDec),
    Expr(Expr),
    EnumDec(EnumDec),
    ImportStatement {
        module_name: ModuleName,
        exposing: Vec<MixedIdentifier>,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub enum MixedIdentifier {
    TypeIdentifier(TypeIdentifier),
    Identifier(Identifier),
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
    Record(Vec<RecordTypeMemeber>),
    EnumDec(EnumDec),
    InferenceRequired,
    String,
    Number,
    Boolean,
    Void,
    Function(Option<TypeIdentifier>, Vec<TypeExpr>, Box<TypeExpr>),
}

#[derive(Debug, Clone, PartialEq)]
pub struct RecordTypeMemeber {
    pub identifier: Identifier,
    pub type_expr: TypeExpr,
}

#[derive(Debug, Clone, PartialEq)]
pub struct EnumDec {
    pub identifier: TypeIdentifier,
    pub type_vars: Vec<TypeIdentifier>,
    pub variants: Vec<EnumVariant>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct EnumVariant {
    pub name: TypeIdentifier,
    pub params: Vec<TypeExpr>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TypeIdentifier {
    pub name: String,
    pub next_segment: Option<Box<TypeIdentifier>>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TypeDec {
    pub identifier: TypeIdentifier,
    pub type_vars: Vec<TypeIdentifier>,
    pub type_val: TypeExpr,
    pub scope: Option<usize>,
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
        scope: Option<usize>,
        identifier: Option<Identifier>,
    },
    ValueReference(Identifier),
    TypeDec(TypeDec),
    Record(Option<TypeIdentifier>, Vec<ObjectMember>),
    Array(TypeExpr, Vec<Expr>),
    BlockExpression(Vec<Expr>, Option<usize>),
    Void,
    Return(Box<Expr>),
    Binary(Box<Expr>, BinaryOp, Box<Expr>),
    Call(Box<Expr>, PostfixOp),
    Match(Box<Expr>, Vec<MatchClause>),
    IfElse(Box<Expr>, Box<Expr>, Box<Expr>),
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
