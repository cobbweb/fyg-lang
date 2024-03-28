#[derive(Debug, Clone, PartialEq)]
pub struct Program {
    pub module_dec: ModuleDec,
    pub imports: Vec<PackageImport>,
    pub statements: Vec<TopStatement>,
    pub scope: Option<usize>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ModuleDec {
    pub name: ModuleName,
    pub exports: Vec<MixedIdentifier>,
}

pub type ModuleName = Vec<String>;

#[derive(Debug, Clone, PartialEq)]
pub struct PackageImport {
    pub package_name: ModuleName,
    pub aliased_name: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ExternPackage {
    pub package_name: String,
    pub definitions: Vec<ExternMember>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ExternMember {
    Function {
        local_name: Identifier,
        external_name: String,
        parameters: Vec<FunctionParameter>,
        return_type: TypeExpr,
    },
    Variable {
        local_name: Identifier,
        external_name: String,
        value_type: TypeExpr,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub enum TopStatement {
    ConstDec(ConstDec),
    TypeDec(TypeDec),
    Expr(Expr),
    EnumDec(EnumDec),
    ExternDec(ExternPackage),
}

#[derive(Debug, Clone, PartialEq)]
pub enum BlockStatement {
    ConstDec(ConstDec),
    Return(Expr),
    Expr(Expr),
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
    InferenceRequired(Option<TypeIdentifier>),
    DotCall(Box<TypeExpr>, Identifier),
    String,
    Number,
    Boolean,
    Void,
    ImportRef(String, Vec<usize>),
    FunctionDefinition {
        type_identifier: TypeIdentifier,
        parameters: Vec<TypeExpr>,
        return_type: Box<TypeExpr>,
    },
    FunctionCall {
        args: Vec<TypeExpr>,
        return_type: Box<TypeExpr>,
        callee: Box<TypeExpr>,
    },
    ExternPackage {
        package_name: String,
        members: Vec<ExternMember>,
    },
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
    pub name: Vec<String>,
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
    FunctionDefinition {
        parameters: Vec<FunctionParameter>,
        return_type: Option<TypeExpr>,
        body: Box<Expr>,
        scope: Option<usize>,
        identifier: Option<Identifier>,
    },
    ValueReference(MixedIdentifier),
    Record(Option<TypeIdentifier>, Vec<ObjectMember>),
    Array(TypeExpr, Vec<Expr>),
    BlockExpression(Vec<BlockStatement>, Option<usize>),
    Void,
    Binary(Box<Expr>, BinaryOp, Box<Expr>),
    DotCall(Box<Expr>, Identifier),
    FunctionCall {
        callee: Box<Expr>,
        args: Vec<Expr>,
        generic_args: Vec<Expr>,
    },
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
