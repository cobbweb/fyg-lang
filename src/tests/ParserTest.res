open Jest
open Expect

let inlineSource = (source: string): Parser.parseSource => {filename: "inline", contents: source}

describe("Parser", () => {
  test("simple module dec", () => {
    let parseResult = inlineSource("module Parser")->Parser.parse
    expect(parseResult)->toBe(Parser.Success)
  })

  let validCode = [
    ("empty program", ""),
    ("single line comment", "/* hello */"),
    ("multi line comment", "/* \n one \n two */"),
    ("integer", "4"),
    ("string", "`my string`"),
    ("value identifier", "foobar"),
    // BASIC CONST
    ("simple integer const", "const four = 4"),
    // DATA TYPES
    ("create an single member object", "{ bar: `baz` }"),
    (
      "create a multi member object",
      "{
         bar: `bar`,
         age: 42,
       }",
    ),
    ("zero element array", "[]"),
    ("single element array", "[4]"),
    ("two number array", "[1, 2,]"),
    ("three element array", "[1, 2, 3,]"),
    ("array with identifiers", "[one, two, three, haha,]"),
    // ("instantiate a record", "const andrew = User({ name: `Andrew`, status: `Total beast`, })"),
    // FUNKY NEWLINES
    // (
    //   "line break in const dec",
    //   "const foo =
    //           bar",
    // ),
    // (
    //   "multiline array",
    //   "[one,
    //                 two  ,   three ,
    //                 four
    //                 , five,
    //                 ]",
    // ),
    // IMPORT
    // ("single import", "import Browser.Dom expose (fetch)"),
    // ("expose as", "import Browser.Html expose as h"),
    // (
    //   "big import",
    //   "import Browser expose (window, DomElement)
    //    import Net.Http expose (Request, Response)
    //    import Browser.Html expose as h
    //    import Foo expose (bar)",
    // ),
    // FUNCTION DEFINTIONS
    // ("simple function", "() => {}"),
    // ("function one param", "(x) => {}"),
    // ("function two param", "(x, y) => {}"),
    // ("function one param with type annotation", "(x: String) => {}"),
    // ("function two param with type annotation", "(x: String, y: Number) => {}"),
    // ("function mixed params", "(x, y: Number, z, bar: SomeType) => {}"),
    // (
    //   "multiline function body",
    //   "(x) => {
    //       const four = 4
    //       return x * four
    //   }",
    // ),
    // FUNCTION CALL
    // ("basic function call", "bar()"),
    // ("dot notation function call", "foo.bar()"),
    // ("deep dot notation function call", "Baz.Bar.foo.bar()"),
    // BINARY EXPRESSIONS
    // ("addition expression", "12 + 7"),
    // ("multiplication expression", "12 * 7"),
    // ("subtraction expression", "12 - 7"),
    // ("division expression", "12 / 7"),
    // ("equals expression", "12 == 7"),
    // ("not equals expression", "12 != 7"),
    // ("greater than expression", "12 > 7"),
    // ("less than expression", "12 < 7"),
    // TYPE DEFINITIONS
    // ("simple type declaration", "type Foo = String"),
    // ("declare a record type", "type User = { name: String, age: Number, }"),
    // ("declare simple generic box", "type Foo<T> = T"),
    // ("declare a record type with a generic", "type Foo<T, Z> = { one: T, two: Z, }"),
    // ("declare a minimal enum", "enum Foo { Bar }"),
    // ("declare a simple enum", "enum Foo { Bar(String) }"),
    // ("declare a multi-member enum", "enum Foo { Bar(String), Baz(Number), Stan, }"),
    // ("declare a simple enum with generic", "enum Option<T> { Some(T), None, }"),
    // MATCH EXPRESSIONS
    // (
    //   "simple match expression",
    //   "match foo {
    //                 `foo` -> `bar`
    //             }",
    // ),
    // (
    //   "common match expression",
    //   "match response {
    //                 bar -> `bar`
    //                 baz -> `baz`
    //             }",
    // ),
    // JUMBOTRON!
    (
      "simple program",
      "const four = 4
    const two = 2
    const result = two * four",
    ),
    // (
    //   "jumbo test #1",
    //   "const foo = (x: Number): Number => if x > 10 { x * 2 } else { x * 5 }
    //    const meaningOfLife = 50 - 8
    //    const result = foo(meaningOfLife)",
    // ),
  ]

  validCode->Array.forEach(((label, code)) => {
    test(
      label,
      () => {
        let parseResult = inlineSource("module Parser.Test\n" ++ code)->Parser.parse
        Console.log(parseResult)
        expect(parseResult)->toBe(Parser.Success)
      },
    )
  })
})
