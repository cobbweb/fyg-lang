open Jest
open Expect

let inlineSource = (source: string): Parser.parseSource => {filename: "inline", contents: source}

describe("Parser", () => {
  test("simple", () => {
    let parseResult = inlineSource("4+8")->Parser.parse
    Console.log(parseResult)
    expect(parseResult)->toBe(Parser.Success)
  })
})
