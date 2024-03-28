#[derive(Clone, Debug, PartialEq)]
pub enum TokenKind {
    // BASICS
    Number(f64),
    String(String),
    Identifier(String),
    TypeIdentifier(String),
    Boolean(bool),

    // SYNTAX
    LParen,
    RParen,
    LCurly,
    RCurly,
    LSquare,
    RSquare,
    LAngle,
    RAngle,
    Assign,
    Plus,
    Minus,
    Divide,
    Asterix,
    Dot,
    Comma,
    Colon,
    FatArrow,
    SkinnyArrow,
    Equality,
    NotEquality,
    GreaterOrEqual,
    LessOrEqual,
    RPipe,
    NL,

    // KEYWORDS
    Const,
    Fn,
    Module,
    Import,
    Enum,
    Type,
    Exporting,
    Return,
    If,
    Else,
    Match,
    From,
    Extern,
    As,

    // RESERVED
    Impl,
    Async,
    Await,
    Offload,
    Switch,
    When,
    Case,

    // Misc
    Unknown(char),
    Comment(String),
}

impl TokenKind {
    pub fn is_number(&self) -> bool {
        matches!(self, TokenKind::Number(_))
    }

    pub fn is_identifier(&self) -> bool {
        matches!(self, TokenKind::Identifier(_))
    }

    pub fn is_type_identifier(&self) -> bool {
        matches!(self, TokenKind::TypeIdentifier(_))
    }

    pub fn is_string(&self) -> bool {
        matches!(self, TokenKind::String(_))
    }

    pub fn is_boolean(&self) -> bool {
        matches!(self, TokenKind::Boolean(_))
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Token {
    pub kind: TokenKind,
    pub line_no: usize,
    pub col_no: usize,
}

pub struct Lexer {
    source_code: String,
    current_pos: usize,
    line_no: usize,
    col_no: usize,
}

impl Lexer {
    pub fn new(source_code: String) -> Self {
        Lexer {
            source_code,
            current_pos: 0,
            line_no: 1,
            col_no: 1,
        }
    }

    fn peek_char(&self) -> Option<char> {
        self.source_code.chars().nth(self.current_pos)
    }

    fn next_char(&mut self) -> Option<char> {
        let ch = self.peek_char()?;
        self.current_pos += 1;

        if ch == '\n' {
            self.line_no += 1;
            self.col_no = 0;
        } else {
            self.col_no += 1;
        }
        Some(ch)
    }

    pub fn tokenize(&mut self) -> Vec<Token> {
        let mut tokens = Vec::new();

        while let Some(ch) = self.next_char() {
            let token = match ch {
                '(' => TokenKind::LParen,
                ')' => TokenKind::RParen,
                '{' => TokenKind::LCurly,
                '}' => TokenKind::RCurly,
                '[' => TokenKind::LSquare,
                ']' => TokenKind::RSquare,
                '+' => TokenKind::Plus,
                '*' => TokenKind::Asterix,
                '-' => TokenKind::Minus,
                ':' => TokenKind::Colon,
                ',' => TokenKind::Comma,
                '\n' => TokenKind::NL,
                '.' => TokenKind::Dot,
                '!' => {
                    if let Some(peek_ch) = self.peek_char() {
                        match peek_ch {
                            '=' => {
                                self.next_char();
                                TokenKind::NotEquality
                            }
                            _ => TokenKind::Unknown('!'),
                        }
                    } else {
                        TokenKind::Unknown('!')
                    }
                }
                '<' => {
                    if let Some(peek_ch) = self.peek_char() {
                        match peek_ch {
                            '=' => {
                                self.next_char();
                                TokenKind::LessOrEqual
                            }
                            _ => TokenKind::LAngle,
                        }
                    } else {
                        TokenKind::LAngle
                    }
                }
                '>' => {
                    if let Some(peek_ch) = self.peek_char() {
                        match peek_ch {
                            '=' => {
                                self.next_char();
                                TokenKind::GreaterOrEqual
                            }
                            _ => TokenKind::RAngle,
                        }
                    } else {
                        TokenKind::RAngle
                    }
                }
                '`' => {
                    let mut string_content = String::new();
                    while let Some(next_ch) = self.next_char() {
                        if next_ch == '`' {
                            // Look ahead to see if it's a double backtick (escape sequence)
                            if self.peek_char() == Some('`') {
                                // Consume the next backtick
                                self.next_char();
                                // Append a single backtick to the string content
                                string_content.push('`');
                            } else {
                                // It's a single backtick, end of string
                                break;
                            }
                        } else {
                            string_content.push(next_ch);
                        }
                    }
                    TokenKind::String(string_content)
                }
                '=' => {
                    if let Some(peek_ch) = self.peek_char() {
                        match peek_ch {
                            '>' => {
                                self.next_char();
                                TokenKind::FatArrow
                            }
                            '=' => {
                                self.next_char();
                                TokenKind::Equality
                            }
                            _ => TokenKind::Assign,
                        }
                    } else {
                        TokenKind::Assign
                    }
                }
                '/' => {
                    if let Some(peek_ch) = self.peek_char() {
                        match peek_ch {
                            // Handle /* */ comments
                            '*' => {
                                self.next_char(); // consume '*'
                                let mut comment = "".to_string();
                                while let Some(comment_char) = self.next_char() {
                                    // look for */ pattern
                                    if comment_char == '*' && self.peek_char() == Some('/') {
                                        self.next_char(); // consume closing '/'
                                        break;
                                    }
                                    comment.push(comment_char)
                                }
                                TokenKind::Comment(comment)
                            }
                            _ => TokenKind::Divide,
                        }
                    } else {
                        TokenKind::Divide
                    }
                }
                _ if ch.is_ascii_digit() => {
                    let mut number = ch.to_string();
                    while let Some(next_ch) = self.peek_char() {
                        if next_ch.is_ascii_digit() {
                            number.push(self.next_char().unwrap());
                        } else {
                            break;
                        }
                    }
                    TokenKind::Number(number.parse().unwrap())
                }
                _ if ch.is_ascii_lowercase() => {
                    let mut identifier = ch.to_string();
                    while let Some(next_ch) = self.peek_char() {
                        if next_ch.is_ascii_alphanumeric() || next_ch == '_' {
                            identifier.push(self.next_char().unwrap());
                        } else {
                            break;
                        }
                    }
                    TokenKind::Identifier(identifier)
                }
                _ if ch.is_ascii_uppercase() => {
                    let mut type_identifier = ch.to_string();
                    while let Some(next_ch) = self.peek_char() {
                        if next_ch.is_ascii_alphanumeric() || next_ch == '_' {
                            type_identifier.push(self.next_char().unwrap());
                        } else {
                            break;
                        }
                    }
                    TokenKind::TypeIdentifier(type_identifier)
                }
                _ => TokenKind::Unknown(ch),
            };

            // NOTE: for better perf move this into a peeking check in identifier lexing
            let final_token = match token {
                TokenKind::Identifier(identifier) => match identifier.clone().as_str() {
                    "as" => TokenKind::As,
                    "async" => TokenKind::Async,
                    "await" => TokenKind::Await,
                    "case" => TokenKind::Case,
                    "const" => TokenKind::Const,
                    "else" => TokenKind::Else,
                    "exporting" => TokenKind::Exporting,
                    "extern" => TokenKind::Extern,
                    "enum" => TokenKind::Enum,
                    "false" => TokenKind::Boolean(false),
                    "fn" => TokenKind::Fn,
                    "from" => TokenKind::From,
                    "if" => TokenKind::If,
                    "import" => TokenKind::Import,
                    "impl" => TokenKind::Impl,
                    "match" => TokenKind::Match,
                    "module" => TokenKind::Module,
                    "offload" => TokenKind::Offload,
                    "return" => TokenKind::Return,
                    "switch" => TokenKind::Switch,
                    "true" => TokenKind::Boolean(true),
                    "type" => TokenKind::Type,
                    "when" => TokenKind::When,
                    _ => TokenKind::Identifier(identifier),
                },
                _ => token.clone(),
            };

            if final_token != TokenKind::Unknown(' ') {
                tokens.push(Token {
                    kind: final_token,
                    line_no: self.line_no,
                    col_no: self.col_no,
                });
            }
        }

        // always end with a NL
        if !matches!(
            tokens.last(),
            Some(Token {
                kind: TokenKind::NL,
                ..
            })
        ) {
            let line_no = if let Some(last_token) = tokens.last() {
                last_token.line_no + 1
            } else {
                1
            };
            tokens.push(Token {
                kind: TokenKind::NL,
                line_no,
                col_no: 1,
            })
        }

        tokens
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_tokens() {
        let mut lexer = Lexer::new(String::from("fn main() { return 42 }"));
        let tokens = lexer.tokenize();

        let expected_tokens = vec![
            TokenKind::Fn,
            TokenKind::Identifier(String::from("main")),
            TokenKind::LParen,
            TokenKind::RParen,
            TokenKind::LCurly,
            TokenKind::Return,
            TokenKind::Number(42.0),
            TokenKind::RCurly,
        ];

        let token_kinds: Vec<TokenKind> = tokens.iter().map(|t| t.kind.clone()).collect();
        assert_eq!(token_kinds, expected_tokens);
    }

    #[test]
    fn test_comment_skipping() {
        let mut lexer = Lexer::new(String::from("42 /* This is a comment */ + 1"));
        let tokens = lexer.tokenize();

        // Assuming comments are skipped and not returned as tokens
        let expected_tokens = vec![
            TokenKind::Number(42.0),
            TokenKind::Comment(String::from(" This is a comment ")),
            TokenKind::Plus,
            TokenKind::Number(1.0),
        ];

        let token_kinds: Vec<TokenKind> = tokens.iter().map(|t| t.kind.clone()).collect();
        assert_eq!(token_kinds, expected_tokens);
    }

    #[test]
    fn test_type_dec() {
        let mut lexer = Lexer::new(String::from("type Foo = Bar"));
        let tokens = lexer.tokenize();

        let expected_tokens = vec![
            TokenKind::Type,
            TokenKind::TypeIdentifier(String::from("Foo")),
            TokenKind::Assign,
            TokenKind::TypeIdentifier(String::from("Bar")),
        ];

        let token_kinds: Vec<TokenKind> = tokens.iter().map(|t| t.kind.clone()).collect();
        assert_eq!(token_kinds, expected_tokens);
    }

    #[test]
    fn test_line_and_column_tracking() {
        let mut lexer = Lexer::new(String::from("fn\nmain()"));
        lexer.tokenize();

        assert_eq!(lexer.line_no, 2);
        assert_eq!(lexer.col_no, 6);
    }

    #[test]
    fn test_operators_and_punctuation() {
        let mut lexer = Lexer::new(String::from("( ) { } [ ] . , : => == ="));
        let tokens = lexer.tokenize();

        let expected_tokens = vec![
            TokenKind::LParen,
            TokenKind::RParen,
            TokenKind::LCurly,
            TokenKind::RCurly,
            TokenKind::LSquare,
            TokenKind::RSquare,
            TokenKind::Dot,
            TokenKind::Comma,
            TokenKind::Colon,
            TokenKind::FatArrow,
            TokenKind::Equality,
            TokenKind::Assign,
        ];

        let token_kinds: Vec<TokenKind> = tokens.iter().map(|t| t.kind.clone()).collect();
        assert_eq!(token_kinds, expected_tokens);
    }
}
