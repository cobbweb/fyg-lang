<h1 align="center">FliteScript</h1>

<p align="center"><strong>FliteScript</strong> is a functional programming language with native interop with TypeScript</p>

> *Note:* FliteScript isn't actually built yet! This repo is just a place to collect feedback _before_ anything is built, sorry to get your hopes up haha!

Just for something different, here's a simple counter app written in FliteScript:

```ts
import { useState } from `react`
import { createRoot } from `react/client`

const Count: React.FC<{ value: number }> = ({ value }) => {
  const countText = match (count) {
    1 -> `One!`
    2 -> `Two!!`
    3 -> `Three!!!`
    default -> Number.toString(count)
  } 
  
  <div className=`font-semibold`>{countText}</div>
}

const CounterApp = () => {
  const [counter, setCounter] = useState(0)
  const increment = setCounter(c => c + 1)
  const decrement = setCounter(c => c - 1)
  const reset = setCounter(() => 0)

  <div>
    <button onClick={() => decrement()}>-1</button>
    <Count value={value} />
    <button onClick={() => increment()}>+1</button>
  </div>
}

const root = document.body |> createRoot()
root.render(<CounterApp />)

```


### Goals

* Functional programming with currying, ADTs and pattern matching, etc
* But should feel _very_ familiar to anyone who's worked with TypeScript
* The most epic developer experience, _ever_
* Seamless interop with existing TypeScript code/libs (just import npm packages using ESM syntax)
* Expressions over statements
* Pragmatic over purity
* Simplify: only one way to do things where possible
* Ultimately, take over the world

### Language output

* Compact TS or JS output, maximise zero-cost abstractions/output
* Included standard library to be auto generated from existing JS runtime specs (Core, Browser, Node/Deno)
* Generate TypeScript Declarations for two-way interop
* WASM runtime support - Node/Deno is just a stopgap

### Roadmap

Current state: finalise desiging and implementing compiler target TS & JS

* Target WASM Runtime for true portability
* Reimplement compiler in FliteScript/WASM (\w insanely good error messages)
* Release a v1 compiler
* Implement basic full stack web framework
* Headless CMS/App building platform
* Hosting/cloud platform
* Support additional UI target (mobile, desktop) with WASM

### Language features

* All control flow is done as expressions, not statements
* Deeply immutable data structures as standard
* Variant types that compile to TS discriminated unions
* Data-first pipe operators: `<|` and `|>`
* Pattern matching with a `match` expression
* Support imperative programming
* JSX syntax built-in (mandatory in fact, not opt in like .tsx)
* Elm-like module/namespacing system for FliteScript code
* Batteries included: compiler, formatter, test runner, language server, etc

### Interop features

- Import and use TypeScript code with regular ESM syntax
- `null` and `undefined` are implicilty converted to an `Option` type
- External `try/catch` blocks are implicitly converted to a `Result` type
- `return` statements are removed, last expression implicitly returns for you
- All top-level declarations are `export`ed by default
- Less ways to do something:
  - Iteration only done via `Array` functions (no `for`, `while`, etc)
  - Functions only defined by arrow function syntax
  - Trailing-commas enforced for multine arrays and objects (handled by built-in formatter)
  - All strings as `\`template strings\``
  - Ternary expressions have been removed, only `if/else` (and the `else` is mandatory)
  - `let` and `var` removed in favour of only using `const` for declaration
  - Class-based OOP features are removed (but still supported when importing TS code)

## Overview

### Basics

A lot of the basics are very much like TypeScript

```ts
const name: string = `world`

// types are also inferred
const hello = `Hello ${name}!`

// Just like JS, no distinction between ints and floats
const magicNumber = 14.75 + 42

// but you can use underscores as arbitrary separators if you like
const longNumber = 1_234_567

```

### Control flow

`if/then` and `match/when` are your bread and butter, and they're both expression.

```ts
// all modules have to be imported at the start of a file
open Core.Console
open Core.Browser exposing (document)

// Built-in Option (a.k.a Maybe) type
const result = match (document.querySelector(`input`)) {
  when (Some(input)) input.value
  when (None) ''
}

// Alternatively use a built-in helper
const result = document.querySelector(`input`) 
  |> Option.mapWithDefault(``, (input) => input.value)

// if/then can only be used as an expression
const name = if (result) name else `world`
Console.log(`Hello ${name}!`)
```

### Improved soundness

Index access on arrays returns an Option. The same applies to index signatures
on interfaces/objects. (NB you can't define index signatures in FliteScript, it's
interop support only).

```ts
const myArray = [1, 2, 3]
const second = myArray[2] |> Option.getWithDefault(3)
```

Additionally, TypeScript's Type Assertion (`as`) feature is removed as it's another
easy way to introduce unsoundness into your system.

### Union types

```ts
open Core.Browser.Console

type Animal = Dog | Cat | Horse

// remember match is an expression so it's return a value here
const getSound = (animal: Animal) => match (animal) {
  case(Dog) `Woof!`
  case(Cat) `Meow!`
  case(Horse) `Neigh!`
}

// more pipes than a Nintendo game!
Cat |> getSound() |> Console.log()
// this is the same as doing: console.log(speak(Cat))
```

### Custom types

The `type` keyword is the only way to create your own types. You can still 
import `interface` and `class` types from TS files, but you cannot declare your 
own in FliteScript.

```ts
// Records just like TS
type User = {
  name: string;
  email: string;
}

type AuthError = {
  status: number;
  message: string;
}

type Users = User[]

// types can hold values
type AuthResult = Success(User) | Failed(AuthError)
// This is similar to discriminated unions in TypeScript:
// type AuthResult = { status: "success", user: User } | { status: "failed", error: AuthError }

const someResult = Success({ name: `Suzanne`, email: `suzanne@acme.corp`, })

```

### Interop with TypeScript packages

This code looks a lot like TypeScript, but it's actually FliteScript!

```ts
// import ESM just like normal
import { z } from `zod`

const userSchema = z.object({
  name: z.string(),
  email: z.string()
})

// The full power of TypeScript's type system is available
type User = z.infer<typeof userSchema>

const makeUser = (params) => 
  userSchema.parse({ 
    name: params.name, 
    email: params.email, 
  })

const users = [`Sally`, `Lionel`]
  |> Array.map((name) => {
    const lowerName = String.toLowerCase(name)
    const email = `${lowerName}@acme.corp`
    { name, email }
  })
  |> Array.map(makeUser)
```

### Async code

```ts
open Core.Json
open Core.Console
open Core.Fetch exposing (fetch)

// await syntax waits for the Promise to eventuate and then casts it to a Result
// By using the built-in Result type, we don't need to use messy try/catch
const getPokemonNumber = async (name: string): Maybe<string> => 
  await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`) 
    |> Result.mapWithDefault(NoPokemon, (result: Json.Object) => 
      if (result.id && result.id instanceof string) Some(result.id) else None
    )
    
const dittoNumber = await getPokemonNumber(`ditto`)
dittoNumber |> Option.withDefault(`Ditto not found`) |> Console.log
```

### Use with React and Remix

```ts
// use FliteScript packages
open MyApp.Collections.Todos exposing (Todo)

// use TS packages
import type { LoaderFunction, V2_MetaFunction, LoaderArgs } from `@remix-run/node`
import { typedjson, useTypedLoaderData } from `remix-typedjson`;

// Declare a module
module App.Routes.Todos

// Functions are automatically exported
const meta: V2_MetaFunction = [{ title: `My Todo List` }]

type LoaderData = LoadingSuccess({ todos: Todo[] }) | LoadingError(string)

const loader: LoaderFunction = ({ request }) => {
  const todos = await getTodos()
  match (todos) {
    when (Success(todos)) typedjson<LoadingSuccess>({ todos })
    when (Error(err)) typedjson<LoadingError>(err.message)
  }
}

const default = () => {
  const { todos } = useTypedLoaderData<LoaderData>()
  
  match (todos) {
    when (LoadingSuccess({ todos })) (
      <ol>
          {todos |> Array.map((todo) => <li key={todo.id}>{todo.name}</li>)}
      </ol>
    )
    when (LoadingError(message)) (
      <div class=`color-red-600 font-semibold`>{message}</div>
    )
  }
}
```
