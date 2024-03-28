use crate::{
    ast::*,
    lexer::{Token, TokenKind},
};

#[derive(Debug, Clone, PartialEq)]
pub struct Parser {
    tokens: Vec<Token>,
    current: usize,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ParserError {
    pub message: String,
    pub line_no: usize,
    pub col_no: usize,
}

fn get_precedence(kind: TokenKind) -> u8 {
    match kind {
        TokenKind::Plus | TokenKind::Minus => 1,
        TokenKind::Asterix | TokenKind::Divide => 2,
        TokenKind::Equality | TokenKind::NotEquality => 3,
        TokenKind::GreaterOrEqual | TokenKind::LessOrEqual => 4,
        _ => 0,
    }
}

impl Parser {
    pub fn new(tokens: Vec<Token>) -> Self {
        Parser { tokens, current: 0 }
    }

    /** seek back to start of token list */
    pub fn reset(&mut self) {
        self.current = 0;
    }

    fn token_parser_error(&self, msg: &str) -> ParserError {
        println!("parser error: {}", msg);
        let token = self.tokens.get(self.current).unwrap();
        let got = format!(". Got {:?}", token.kind);
        ParserError {
            message: format!("{}{}", msg, got),
            line_no: token.line_no,
            col_no: token.col_no,
        }
    }

    pub fn parse(&mut self) -> Result<Program, ParserError> {
        self.swallow_lines();
        if let Some(token) = self.next_token() {
            if token.kind != TokenKind::Module {
                return Err(self.token_parser_error("Expected module keyword"));
            }
        }
        let module_dec = self.parse_get_module_dec()?;
        self.swallow_lines();

        let imports = self.parse_imports()?;

        let mut top_level_exprs = Vec::new();
        while self.current < self.tokens.len() {
            self.swallow_lines();
            if self.peek_token().is_none() {
                break;
            }
            let top_level_expr = self.parse_top_statement()?;
            top_level_exprs.push(top_level_expr)
        }

        Ok(Program {
            scope: None,
            statements: top_level_exprs,
            module_dec,
            imports,
        })
    }

    pub fn parse_get_module_dec(&mut self) -> Result<ModuleDec, ParserError> {
        let _ = self.consume_expected(TokenKind::Module, "Expected module keyword");
        let module_name = self.parse_module_name()?;
        let mut exports = Vec::new();

        if self.peek_token_kind() == Some(TokenKind::Exporting) {
            let _ = self.consume_expected(TokenKind::Exporting, "exporting keyword");
            let mut just_consumed_iden = false;
            while let Some(peek_token) = self.peek_token() {
                match &peek_token.kind {
                    TokenKind::Identifier(name) if !just_consumed_iden => {
                        exports.push(MixedIdentifier::Identifier(Identifier {
                            name: name.to_string(),
                        }));
                        self.next_token(); // consume the Identifier
                        just_consumed_iden = true;
                    }

                    TokenKind::TypeIdentifier(name) if !just_consumed_iden => {
                        exports.push(MixedIdentifier::TypeIdentifier(TypeIdentifier {
                            name: vec![name.to_string()],
                        }));
                        self.next_token(); // consume the TypeIdentifier
                        just_consumed_iden = true;
                    }

                    TokenKind::Comma if just_consumed_iden => {
                        let _ = self.consume_expected(TokenKind::Comma, ",")?;
                        // self.swallow_lines();
                        just_consumed_iden = false;
                    }

                    TokenKind::NL if just_consumed_iden => {
                        break;
                    }
                    _ => {
                        let message = if just_consumed_iden {
                            "Expected comma or newline1"
                        } else {
                            "Expected an identifier or type identifer"
                        };
                        return Err(self.token_parser_error(message));
                    }
                }
            }
        }

        Ok(ModuleDec {
            name: module_name,
            exports,
        })
    }

    // from Package.Name import someFunction, GoatType
    fn parse_imports(&mut self) -> Result<Vec<PackageImport>, ParserError> {
        let mut imports = Vec::new();
        // each iteration will consume up to the next "from" token
        // unless all the import statements have been parsed
        while self.peek_token_kind() == Some(TokenKind::From) {
            let _ = self.consume_expected(TokenKind::From, "from clause")?;
            self.swallow_lines();

            // Extract the import package name
            let package_name = self.parse_module_name()?;

            let aliased_name = if let Some(TokenKind::As) = self.peek_token_kind() {
                self.consume_expected(TokenKind::As, "as keyword");

                let aliased_name_token = self.consume_matching_expected(
                    |t| matches!(t.kind, TokenKind::TypeIdentifier(_)),
                    "alias named (starting with uppercase letter)",
                )?;
                if let TokenKind::TypeIdentifier(alias_name) = aliased_name_token.kind {
                    Some(alias_name)
                } else {
                    None
                }
            } else {
                None
            };

            imports.push(PackageImport {
                package_name,
                aliased_name,
            });

            self.require_new_line();
            self.swallow_lines();
        }

        Ok(imports)
    }

    fn parse_module_name(&mut self) -> Result<ModuleName, ParserError> {
        self.swallow_lines();
        let mut module_name = Vec::new();
        // toggle to ensure we correctly alternative between Identifer and Dot tokens
        let mut expect_type_identifier = true;

        while let Some(peek_token) = self.peek_token() {
            match peek_token.kind {
                TokenKind::TypeIdentifier(_) if expect_type_identifier => {
                    if let TokenKind::TypeIdentifier(type_identifier) = &peek_token.kind {
                        module_name.push(type_identifier.clone());
                        self.next_token();
                        expect_type_identifier = false;
                    }
                }
                TokenKind::Dot if !expect_type_identifier => {
                    self.next_token();
                    expect_type_identifier = true;
                }
                _ => {
                    break;
                }
            }
        }

        if module_name.is_empty() {
            return Err(self.token_parser_error("Expected module name2"));
        }

        Ok(module_name)
    }

    fn parse_top_statement(&mut self) -> Result<TopStatement, ParserError> {
        self.swallow_lines();

        let peek_token = self
            .peek_token()
            .ok_or(self.token_parser_error("no more tokens when parsing top statement"))?;

        let top_statement = match peek_token.kind {
            TokenKind::Extern => TopStatement::ExternDec(self.parse_extern()?),
            _ => {
                // assume block-like statement
                let expr = self.parse_block_statement()?;
                match expr {
                    BlockStatement::ConstDec(const_dec) => TopStatement::ConstDec(const_dec),
                    BlockStatement::Return(_) => {
                        Err(self.token_parser_error("Unexpected return at top level"))?
                    }
                    BlockStatement::Expr(expr) => TopStatement::Expr(expr),
                }
            }
        };

        println!("top statement {:?}", top_statement);
        Ok(top_statement)
    }

    fn parse_block_statement(&mut self) -> Result<BlockStatement, ParserError> {
        println!("parse_block_statement {:?}", self.peek_token());
        self.swallow_lines();
        let peek_token = self.peek_token().unwrap();
        let statement = match peek_token.kind {
            TokenKind::Const => BlockStatement::ConstDec(self.parse_const_dec()?),
            TokenKind::Return => BlockStatement::Return(self.parse_expr()?),
            _ => {
                // assume Expr
                BlockStatement::Expr(self.parse_expr()?)
            }
        };

        Ok(statement)
    }

    fn parse_expr(&mut self) -> Result<Expr, ParserError> {
        self.parse_expr_with_precedence(0)
    }

    fn parse_expr_with_precedence(&mut self, min_precedence: u8) -> Result<Expr, ParserError> {
        println!("parse_expr_with_precedence {:?}", self.peek_token());
        let mut lhs = self.parse_primary_expr()?;
        println!("got lhs primary {:?}", lhs);

        loop {
            let should_continue = self.peek_for_expr_continuation();
            println!("should continue {}", should_continue);

            if !should_continue {
                break;
            }

            self.swallow_lines();

            let peek_precedence = self.peek_token_kind().map(get_precedence).unwrap_or(0);

            // If the next token's precedence is less than the minimum, exit the loop
            if peek_precedence < min_precedence {
                break;
            }

            // Consume the operator because its precedence is high enough
            if let Some(op_token) = self.next_token() {
                let binary_op = match op_token.kind {
                    TokenKind::Plus => BinaryOp::Add,
                    TokenKind::Minus => BinaryOp::Subtract,
                    TokenKind::Asterix => BinaryOp::Multiply,
                    TokenKind::Divide => BinaryOp::Divide,
                    TokenKind::Equality => BinaryOp::Equal,
                    TokenKind::GreaterOrEqual => BinaryOp::GreaterOrEqual,
                    TokenKind::LessOrEqual => BinaryOp::LessOrEqual,
                    _ => {
                        println!("not a binary op, break {:#?}", op_token);
                        break;
                    }
                };

                // Parse the right-hand side of the operator at a higher precedence
                let rhs = self.parse_expr_with_precedence(peek_precedence + 1)?;

                // Combine lhs and rhs with the operator into a new lhs
                lhs = Expr::Binary(Box::new(lhs), binary_op, Box::new(rhs));
            } else {
                break;
            }
        }

        Ok(lhs)
    }

    fn parse_primary_expr(&mut self) -> Result<Expr, ParserError> {
        println!("parse primary expr: {:?}", self.peek_token());
        let peek_token = self.peek_token().unwrap();
        let expr = match peek_token.kind {
            TokenKind::Number(_) => self.parse_number_expr()?,
            TokenKind::String(_) => self.parse_string_expr()?,
            TokenKind::Boolean(_) => self.parse_boolean_expr()?,
            TokenKind::Identifier(_) | TokenKind::TypeIdentifier(_) => self.parse_iden_or_call()?,
            TokenKind::LParen => {
                if self.peek_for_fn_defition()? {
                    println!("detected fn def {:?}", self.peek_token());
                    return self.parse_fn_definition();
                }
                println!("have lparen but not fn def");

                let _ = self.consume_expected(TokenKind::LParen, "opening parenthesis");
                let expr = self.parse_expr()?;
                let _ = self.consume_expected(TokenKind::RParen, "closing parenthesis");
                expr
            }
            TokenKind::LCurly => Expr::BlockExpression(self.parse_block_expr()?, None),
            _ => {
                println!("Unhandled token {:?}", peek_token);
                todo!()
            }
        };

        Ok(expr)
    }

    fn parse_block_expr(&mut self) -> Result<Vec<BlockStatement>, ParserError> {
        let closing_curly_pos =
            self.find_matching_closing_paren(TokenKind::LCurly, TokenKind::RCurly)?;
        self.consume_expected(TokenKind::LCurly, "opening curly")?;

        let mut statements = Vec::new();
        while self.current < closing_curly_pos {
            self.swallow_lines();
            statements.push(self.parse_block_statement()?);
            self.swallow_lines();
        }

        self.consume_expected(TokenKind::RCurly, "closing curly")?;

        Ok(statements)
    }

    fn parse_extern(&mut self) -> Result<ExternPackage, ParserError> {
        let _ = self.consume_expected(TokenKind::Extern, "extern keyword")?;
        self.swallow_lines();
        let package_name = {
            let token = self
                .next_token()
                .ok_or(self.token_parser_error("no more tokens after extern?"))?;
            match token.kind {
                TokenKind::String(string_value) => Ok(string_value),
                _ => Err(self.token_parser_error("extern package name should be a string")),
            }
        }?;
        self.swallow_lines();

        let closing_curly_pos =
            self.find_matching_closing_paren(TokenKind::LCurly, TokenKind::RCurly)?;
        let _ = self.consume_expected(TokenKind::LCurly, "open curly")?;

        let mut members = Vec::new();

        // parse extern body
        while self.current < closing_curly_pos {
            self.swallow_lines();

            // get the member identifier
            let local_identifier = self.parse_identifier()?;

            let _ = self.consume_expected(TokenKind::Colon, "colon after local name")?;

            let peek_token = self
                .peek_token()
                .ok_or(self.token_parser_error("parse_extern: expected another token"))?;
            let identifier = match peek_token.kind {
                TokenKind::Identifier(_) => {
                    let identifier = self.parse_identifier()?;
                    Ok(identifier.name)
                }
                TokenKind::TypeIdentifier(_) => {
                    let type_identifier = self.parse_type_identifier()?;
                    // TODO: just getting the first segment here
                    Ok(type_identifier
                        .name
                        .get(0)
                        .cloned()
                        .expect("At least one name"))
                }
                _ => Err(self
                    .token_parser_error("parse_extern: Expected a identifier for external name")),
            }?;

            // determine the member kind
            let peek_token = self
                .peek_token()
                .ok_or(self.token_parser_error("parse_extern: expected another token"))?;

            let member = match peek_token.kind {
                // function
                TokenKind::LParen => {
                    let closing_paren_pos =
                        self.find_matching_closing_paren(TokenKind::LParen, TokenKind::RParen)?;
                    let _ = self.consume_expected(TokenKind::LParen, "open paren")?;
                    let mut params = Vec::new();

                    // parse parameters
                    while self.current < closing_paren_pos {
                        let param_name = self.parse_identifier()?;
                        let _ =
                            self.consume_expected(TokenKind::Colon, "colon after param name")?;
                        let param_type = self.parse_type_expr()?;
                        let param = FunctionParameter {
                            identifier: param_name,
                            type_expr: Some(param_type),
                        };
                        params.push(param);

                        self.swallow_lines();
                        println!(
                            "extern param pos: {} of {}",
                            self.current, closing_paren_pos
                        );
                        // consume trailing comma
                        if self.current < closing_paren_pos {
                            self.consume_expected(TokenKind::Comma, "comma after parameter")?;
                        }
                        self.swallow_lines();
                    }
                    self.swallow_lines();
                    let _ = self.consume_expected(TokenKind::RParen, "closing paren")?;

                    // parse return type
                    self.swallow_lines();
                    let _ =
                        self.consume_expected(TokenKind::FatArrow, "fat arrow after parameters")?;
                    self.swallow_lines();
                    let return_type = self.parse_type_expr()?;

                    // consume trailing comma
                    self.swallow_lines();
                    self.consume_expected(TokenKind::Comma, "trailing comma")?;

                    ExternMember::Function {
                        local_name: local_identifier,
                        external_name: identifier,
                        parameters: params,
                        return_type,
                    }
                }
                _ => {
                    return Err(
                        self.token_parser_error("Unexpected token in extern member defintion")
                    )
                }
            };
            self.swallow_lines();
            members.push(member);
        }

        self.swallow_lines();
        self.consume_expected(TokenKind::RCurly, "closing curly")?;

        Ok(ExternPackage {
            package_name,
            definitions: members,
        })
    }

    fn parse_const_dec(&mut self) -> Result<ConstDec, ParserError> {
        if self.peek_token().unwrap().kind != TokenKind::Const {
            return Err(self.token_parser_error("Expected const keyword"));
        }
        self.next_token(); // consume "const"

        let identifier = self.parse_identifier()?;
        let peek_token = self.peek_token().unwrap();
        let mut type_annotation: Option<TypeExpr> = None;

        // check for optional type annotation
        if let TokenKind::Colon = peek_token.kind {
            self.next_token(); // consume ":"
            type_annotation = Some(self.parse_type_expr()?);
        }

        if self.peek_token().unwrap().kind != TokenKind::Assign {
            return Err(self.token_parser_error("Expected ="));
        }
        self.next_token(); // consume "="

        Ok(ConstDec {
            identifier,
            type_annotation,
            value: Box::new(self.parse_expr()?),
        })
    }

    // TODO: Need to handle module name ref (e.g. Log.print)
    // "Log" comes in as a type identifier
    fn parse_iden_or_call(&mut self) -> Result<Expr, ParserError> {
        println!("parse_iden_or_call");
        let mixed_identifier = self.parse_mixed_identifier()?;
        let value_ref = Expr::ValueReference(mixed_identifier.clone());
        let mut expr = value_ref;

        while let Some(peek_token) = self.peek_token() {
            match peek_token.kind {
                TokenKind::LParen => {
                    let mut args: Vec<Expr> = Vec::new();
                    let closing_paren_index =
                        self.find_matching_closing_paren(TokenKind::LParen, TokenKind::RParen)?;
                    println!("closing index: {} {}", self.current, closing_paren_index);
                    let _ = self.consume_expected(TokenKind::LParen, "opening paren");

                    while self.current < closing_paren_index {
                        println!("parsing argument");
                        args.push(self.parse_expr()?);
                        println!("argument parsed");
                        self.swallow_lines();
                        println!("position: {} {}", self.current, closing_paren_index);
                        if self.current < closing_paren_index {
                            let _ = self.consume_expected(TokenKind::Comma, "comma separator")?;
                        }
                    }
                    let _ = self.consume_expected(TokenKind::RParen, "expected closing paren")?;

                    expr = Expr::FunctionCall {
                        callee: Box::new(expr),
                        args,
                        generic_args: Vec::new(),
                    }
                }
                TokenKind::Dot => {
                    let _ = self.consume_expected(TokenKind::Dot, "expected dot");
                    let rhs_iden = self.parse_identifier()?;

                    expr = Expr::DotCall(Box::new(expr), rhs_iden);
                }
                TokenKind::LAngle => {
                    // lookeahead, if not a TypeIdentifier, then it's a less than operator
                    let double_peek_token_kind = self.peek_token_kind().unwrap();
                    if double_peek_token_kind.is_type_identifier() {
                        self.next_token(); // consume "<"
                        let closing_angle_index =
                            self.find_matching_closing_paren(TokenKind::LAngle, TokenKind::RAngle)?;
                        let mut type_args: Vec<TypeExpr> = Vec::new();
                        while self.current < closing_angle_index {
                            type_args.push(self.parse_type_expr()?);
                            self.consume_if(|t| t.kind == TokenKind::Comma);
                        }
                    } else {
                        break;
                    }
                }
                _ => break,
            }
        }

        Ok(expr)
    }

    fn peek_for_fn_defition(&mut self) -> Result<bool, ParserError> {
        println!("peeking for fn def");
        if !self.peek_expected_kind(TokenKind::LParen) {
            println!("not an lparen");
            return Ok(false);
        }
        let close_paren = self.find_matching_closing_paren(TokenKind::LParen, TokenKind::RParen)?;
        if let Some(after_paren_token) = self.tokens.get(close_paren + 1) {
            match after_paren_token.kind {
                // has no type annotation
                TokenKind::FatArrow => Ok(true),
                // maybe a type annotation?
                TokenKind::Colon => {
                    // TODO: need to be smart here I think?
                    Ok(true)
                }
                _ => Ok(false),
            }
        } else {
            Ok(false)
        }
    }

    fn parse_fn_definition(&mut self) -> Result<Expr, ParserError> {
        let params_closing_paren_index =
            self.find_matching_closing_paren(TokenKind::LParen, TokenKind::RParen)?;
        self.next_token(); // consume "("
        let mut parameters: Vec<FunctionParameter> = Vec::new();
        let mut return_type: Option<TypeExpr> = None;

        while self.current < params_closing_paren_index {
            let identifier = self.parse_identifier()?;
            let mut type_anno: Option<TypeExpr> = None;

            // check for type anno
            if self.peek_token().unwrap().kind == TokenKind::Colon {
                self.next_token(); // consume ":"
                type_anno = Some(self.parse_type_expr()?);
            }

            parameters.push(FunctionParameter {
                identifier,
                type_expr: type_anno,
            });

            match self.peek_token() {
                Some(token) if token.kind == TokenKind::Comma => {
                    self.next_token(); // end of one param, consume and try another param
                }
                Some(token) if token.kind == TokenKind::RParen => break,
                _ => {
                    return Err(self.token_parser_error(
                        "Expected comma or closing parenthesis around fn definition parameters",
                    ))
                }
            }
        }

        self.consume_matching_expected(|t| t.kind == TokenKind::RParen, "Expected closing paren")?;

        // check for return type anno
        if self.peek_token().unwrap().kind == TokenKind::Colon {
            println!("fn def has type anno");
            self.next_token(); // consume ":"
            return_type = Some(self.parse_type_expr()?);
        }

        let _ = self.consume_matching_expected(|t| t.kind == TokenKind::FatArrow, "=>")?;
        println!("parsing fn body {:?}", self.peek_token());
        let body = self.parse_expr()?;
        println!("parsed fn body");

        Ok(Expr::FunctionDefinition {
            parameters,
            return_type,
            body: Box::new(body),
            scope: None,
            identifier: None,
        })
    }

    fn parse_boolean_expr(&mut self) -> Result<Expr, ParserError> {
        let token = self.consume_matching_expected(
            |t| matches!(t.kind, TokenKind::Boolean(_)),
            "boolean literal",
        )?;
        if let TokenKind::Boolean(bool) = token.kind {
            return Ok(Expr::Boolean(bool));
        }
        Err(self.token_parser_error("Unexpected issue parsing boolean literal"))
    }

    fn parse_number_expr(&mut self) -> Result<Expr, ParserError> {
        let token = self.consume_matching_expected(
            |t| matches!(t.kind, TokenKind::Number(_)),
            "number literal",
        )?;
        if let TokenKind::Number(number) = token.kind {
            return Ok(Expr::Number(number.to_string()));
        }
        Err(self.token_parser_error("Unexpected issue parsing number"))
    }

    fn parse_string_expr(&mut self) -> Result<Expr, ParserError> {
        let token = self.consume_matching_expected(
            |t| matches!(t.kind, TokenKind::String(_)),
            "string literal",
        )?;
        if let TokenKind::String(string) = token.kind {
            return Ok(Expr::String(string));
        }
        Err(self.token_parser_error("Unexpected issue parsing string"))
    }

    fn parse_return_statement(&mut self) -> Result<BlockStatement, ParserError> {
        let _return = self
            .consume_matching_expected(|t| matches!(t.kind, TokenKind::Return), "return keyword")?;
        let expr = self.parse_expr()?;
        Ok(BlockStatement::Return(expr))
    }

    fn parse_identifier(&mut self) -> Result<Identifier, ParserError> {
        let token = self.consume_matching_expected(
            |t| matches!(t.kind, TokenKind::Identifier(_)),
            "identifier",
        )?;
        if let TokenKind::Identifier(name) = token.kind {
            return Ok(Identifier { name });
        }
        Err(self.token_parser_error("Unexpected issue parsing identifier"))
    }

    fn parse_mixed_identifier(&mut self) -> Result<MixedIdentifier, ParserError> {
        if let Some(token) = self.peek_token() {
            match token.kind {
                TokenKind::Identifier(_) => {
                    Ok(MixedIdentifier::Identifier(self.parse_identifier()?))
                }
                TokenKind::TypeIdentifier(_) => Ok(MixedIdentifier::TypeIdentifier(
                    self.parse_type_identifier()?,
                )),
                _ => Err(self.token_parser_error("identifier or type identifier")),
            }
        } else {
            Err(self.token_parser_error("identifier or type identifier"))
        }
    }

    fn parse_type_expr(&mut self) -> Result<TypeExpr, ParserError> {
        let peek_token = self.peek_token().unwrap();
        let type_expr = match &peek_token.kind {
            TokenKind::TypeIdentifier(name) => match name.as_str() {
                "String" => {
                    self.next_token(); // consume
                    TypeExpr::String
                }
                "Void" => {
                    self.next_token(); // consume
                    TypeExpr::Void
                }
                _ => TypeExpr::TypeRef(self.parse_type_identifier()?),
            },
            _ => todo!(),
        };
        Ok(type_expr)
    }

    fn parse_type_identifier(&mut self) -> Result<TypeIdentifier, ParserError> {
        if !self.peek_token().unwrap().kind.is_type_identifier() {
            return Err(self.token_parser_error("Expected type identifier"));
        }
        let token = self.next_token().unwrap();
        if let TokenKind::TypeIdentifier(name) = token.kind {
            Ok(TypeIdentifier { name: vec![name] })
        } else {
            Err(self.token_parser_error("Unexpected error parsing type identifier"))
        }
    }

    pub fn consume_expected(
        &mut self,
        kind: TokenKind,
        expected_name: &str,
    ) -> Result<Token, ParserError> {
        if let Some(token_kind) = self.peek_token_kind() {
            if token_kind == kind {
                return Ok(self
                    .next_token()
                    .expect("Token should exist! We just peeked yo!"));
            }
        }
        Err(self.token_parser_error(expected_name))
    }

    pub fn consume_matching_expected<F>(
        &mut self,
        condition: F,
        expected_name: &str,
    ) -> Result<Token, ParserError>
    where
        F: Fn(&Token) -> bool,
    {
        // Peek at the current token to check if it matches the condition.
        if let Some(token) = self.peek_token() {
            if condition(token) {
                // If the condition matches, consume the token and return it.
                return Ok(self.next_token().unwrap());
            }
        }
        // If the token doesn't match the condition or there are no more tokens,
        // return an error.
        Err(self.token_parser_error(&format!("Expected: {}", expected_name).to_string()))
    }

    pub fn consume_if<F>(&mut self, condition: F) -> Option<Token>
    where
        F: Fn(&Token) -> bool,
    {
        // Peek at the current token to check if it matches the condition.
        if let Some(token) = self.peek_token() {
            if condition(token) {
                // If the condition matches, consume the token and return it.
                return self.next_token();
            }
        }
        None
    }

    /// Looks ahead from the current position to find the matching closing parenthesis.
    /// Returns the index of the matching closing parenthesis or `None` if it's not found.
    fn find_matching_closing_paren(
        &mut self,
        open_kind: TokenKind,
        close_kind: TokenKind,
    ) -> Result<usize, ParserError> {
        let mut depth = 0;
        let mut current_pos = self.current;

        while let Some(token) = self.tokens.get(current_pos) {
            if token.kind == open_kind {
                depth += 1;
            } else if token.kind == close_kind {
                depth -= 1;
                if depth == 0 {
                    // Matching closing token found.
                    return Ok(current_pos);
                }
            }
            // Move to the next token.
            current_pos += 1;
        }

        // If we reach the end without finding a matching closing parenthesis, return None.
        Err(self
            .token_parser_error(format!("Couldn't find closing kind {:?}", close_kind).as_str()))
    }

    fn peek_token(&self) -> Option<&Token> {
        self.tokens.get(self.current).clone()
    }

    fn peek_token_kind(&self) -> Option<TokenKind> {
        self.tokens.get(self.current).map(|t| t.kind.clone())
    }

    fn peek_expected_kind(&mut self, expected_kind: TokenKind) -> bool {
        self.peek_token_kind()
            .map_or(false, |kind| kind == expected_kind)
    }

    fn peek_for_expr_continuation(&self) -> bool {
        let mut position = self.current;
        println!("peeking pos {}", position);

        // peek through any newlines
        while let Some(token) = self.tokens.get(position) {
            if token.kind == TokenKind::NL {
                position += 1;
            } else {
                break;
            }
        }

        if position == self.current {
            // no line breaks, check for "closing" syntax
            if let Some(peek_token) = self.tokens.get(position) {
                let is_closing_syntax = matches!(
                    peek_token.kind,
                    TokenKind::RCurly | TokenKind::RParen | TokenKind::RAngle | TokenKind::RSquare
                );
                if is_closing_syntax {
                    return false;
                }
            } else {
                // no more tokens, we do!
                return false;
            }
        }

        // line breaks detected, check if the next significant token might be the rest of
        // a multi-line expression
        if let Some(peek_token) = self.tokens.get(position) {
            matches!(
                peek_token.kind,
                TokenKind::LParen
                    | TokenKind::Dot
                    | TokenKind::LAngle
                    | TokenKind::RPipe
                    | TokenKind::FatArrow
                    | TokenKind::SkinnyArrow
                    | TokenKind::Plus
                    | TokenKind::Minus
                    | TokenKind::Asterix
                    | TokenKind::Divide
                    | TokenKind::Equality
                    | TokenKind::NotEquality
                    | TokenKind::GreaterOrEqual
                    | TokenKind::LessOrEqual
            )
        } else {
            false
        }
    }

    fn next_token(&mut self) -> Option<Token> {
        let token = self.tokens.get(self.current).cloned();
        if token.is_some() {
            println!("consumed {:?}", token.clone().unwrap());
            self.current += 1;
        }
        token
    }

    fn require_new_line(&mut self) -> Option<ParserError> {
        if let Some(peek_token) = self.peek_token() {
            if peek_token.kind != TokenKind::NL {
                Some(self.token_parser_error("Expected newline"))
            } else {
                None
            }
        } else {
            None
        }
    }

    fn swallow_lines(&mut self) {
        while let Some(peek_token) = self.peek_token() {
            if peek_token.kind == TokenKind::NL {
                self.next_token();
            } else {
                break;
            }
        }
    }
}

#[cfg(test)]
mod test {
    use crate::lexer::Lexer;

    use super::*;

    fn create_parse_tree(input: &str) -> Result<Program, ParserError> {
        let mut lexer = Lexer::new(input.to_string());
        let tokens = lexer.tokenize();
        let mut parser = Parser::new(tokens);
        return parser.parse();
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
            ("postfix combo", "foo.bar<Baz>(cheeze)"),
            // DATA TYPES
            ("create an array", "[one, two, three, haha,]"),
            (
                "instantiate a record",
                "const andrew = User{ name: `Andrew`, status: `Total Beast` }",
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
            ("single import", "import Browser.Dom expose (fetch, header)"),
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
            (
                "multiline function body",
                "(x) => {
                    const two = 2
                    return x * four
                }",
            ),
            // FUNCTION CALL
            ("basic function call", "foobar()"),
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
            // RECORDS
            ("simple record expression", "User({ name: `Andrew` })"),
            // TYPE DEFINITIONS
            ("simple type declaration", "type Foo = String"),
            (
                "declare a record type",
                "type User = { name: String, age: Number, }",
            ),
            ("declare simple generic box", "type Foo<F> = F"),
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
                panic!("{} {:?}", name, result.unwrap_err());
            }
        }
    }

    #[test]
    fn test_jumbo_convert_program() {
        let tests = [
            // BASICS
            ("empty program", ""),
            ("single line comment", "/* hello */"),
            ("multi line comment", "/* \n one \n two */"),
            ("integer", "4"),
            ("string", "`my string`"),
            // DATA TYPES
            ("create an array", "[one, two, three, haha,]"),
            (
                "instantiate a record",
                "const andrew = SomeModule.Baz.User{ name: `Andrew`, status: `Total beast`, }",
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
            ("single import", "import Browser.Dom expose (fetch, header)"),
            ("expose as", "import Browser.Html expose as h"),
            (
                "big import",
                "import Browser expose (window, DomElement)
                 import Net.Http expose (Request, Response)
                 import Browser.Html expose as h
                 import Foo expose (bar)",
            ),
            // IF/ELSE
            (
                "multine line if/else",
                "if foo == True {
                const bar = `it is true`
                println(bar)
            } else {
                const bar = `it is false`
                println(bar)
            }",
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
            (
                "multiline function body",
                "(x) => {
                    const two = 2
                    return x * four
                }",
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
            ("declare simple generic box", "type Foo<F, G> = T"),
            (
                "declare a record type with a generic",
                "type Foo<T, Z> = { one: T, two: Z, }",
            ),
            (
                "declare a mega enum",
                "enum Foo<T> { Bar(String, T), Baz(Number), Gee, }",
            ),
            ("declare a minimal enum", "enum Foo { Bar }"),
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
                panic!("{} {:?}", name, result.unwrap_err());
            }
        }
    }
}
