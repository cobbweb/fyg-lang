let entryFile = QuickJS.scriptArgs->Array.get(1)->Option.getExn

Console.log(entryFile)
let source = QuickJS.loadFile(entryFile)->Option.getExn
Console.log(source)

let parseResult = Parser.parse({filename: entryFile, contents: source})
Console.log(parseResult->JSON.stringifyAnyWithIndent(2))
