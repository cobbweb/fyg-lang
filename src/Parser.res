@module("./parser.build.js") external parser: 'a = "parse"

type parseSource = {
  filename: string,
  contents: string,
}

type filePos = {
  offset: int,
  line: int,
  column: int,
}

type location = {
  source: option<string>,
  start: filePos,
  end: filePos,
}

type internalParseError = {
  message: string,
  expected: Js.Dict.t<string>,
  found: string,
  location: location,
}

type parseError = {
  exn: Js.Exn.t,
  message: string,
  prettyMessage: string,
}

type parseResult = Success | Error(parseError)

let parse = (source: parseSource): parseResult => {
  try {
    let parseResult = parser(source.contents)
    Console.log2("parse result: ", parseResult)
    Success
  } catch {
  | Js.Exn.Error(obj) => {
      // Assuming `obj` can be treated as `internalParseError` directly
      let internalError: internalParseError = Obj.magic(obj)

      // Constructing `parseError` from `internalError`
      let parserError = {
        exn: obj,
        message: internalError.message,
        prettyMessage: internalError.message,
      }
      Error(parserError)
    }
  }
}
