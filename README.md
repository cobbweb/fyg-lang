<h1 align="center">Fyg</h1>

<p align="center"><strong>Fyg</strong> is a high-level, general purpose programming language for production. It's heavily inspired by the simplistic and cohesive qualities of Go, but brings additional type safety and functional approaches.</p>

> _Note:_ Fyg is still being built! So it's not acutally ready for production yet 
> _Note2:_ I'm still learning Rust, so ignore there's enough clones to fill the Grand Army 😅

### Goals

- Simple as can be, only one way to do things where possible
- A fun and sound type system that deters perfectionism (encourage clear over clever)
- Cohesive DX. One CLI for builds, package management, formatting, testing, LSP, etc
- Escape hatches to get started quickly, improve over time for getting production ready
- Interactive compiler: Local AI to assist the correction of type errors (works in LSP too)
- Brand new ecosystem, no clunky interop or legacy systems
- No options/config
- Fantastic standard library to reduce dependency nightmares

---

## Overview

### Basics

The `const` keyword is the only type of "variable". They can never be reassigned or shadowed.

```ts
const name: String = `world`

// types are also inferred
const hello = `Hello ${name}!`

// one primary type for all number, the classic float64
const magicNumber = 14.75 + 42

// but you can use underscores as arbitrary separators if you like
const longNumber = 1_234_567.89

// top level function must have type annotations
const double = (n: Number) => n * 2 
```

_Note: Variable shadowing and a `mutable` alternative is under consideration._

### Control flow

Match expression are pretty straight-forward. I'm still trying to figure the if/else expression syntax out.

```ts
// all modules have to be imported at the start of a file
import Log 
import Http

// Returns a "Result" type
const result = Http.makeRequest(`https://api.awesome.sauce/my-name`)

// Basic types, including Result & Option are implicitly imported
const responseText = match (result) {
  Ok(response) -> response.text
  Err -> `Request failed`
}

// No ternary syntax, if is an expression (else is mandatory)
const name = if String.length(responseText) < 12 { name } else { `world` }
Log.println(`Hello ${name}!`)
```

There is no special iteration syntax (e.g. `for` or `while`). Use `Array` functions instead:

```ts
import Array
import Log 

const numbers = [1, 2, 3, 4]
const doubled = numbers |> Array.map(n => n * 2)
doubled |> Array.forEach(Log.println) // outputs: 2, 4, 6, 8
```

### Union types

```ts
import Log

enum Animal = {
  Dog,
  Cat,
  Horse,
}

// remember match is an expression so it's return a value here
const getSound = (animal: Animal) => match (animal) {
  Dog -> `Woof!`
  Cat -> `Meow!`
  Horse -> `Neigh!`
}

Log.println(getSound(Animal.Cat))

// Note: Pipe operator is under consideration
Animal.Cat |> getSound() |> Log.println()


// Note: Enum values be hoisted up is under consideration
getSound(Dog) // like this, no `Animal` prefix

// Specific enum variants can be used as types too
const doWoof = (dog: Animal.Dog) => `Dog goes WOOF!`
```

### Custom types

You can define your own types

```ts
// basic opaque type
type EmailAddress = String

type User = {
  name: String,
  email: EmailAddress,
}

type AuthError = {
  status: Number,
  message: String,
}

type Users = User[]

enum AuthResult {
  Authenticated(User, String),
  Failed(AuthError),
}

const users = [
  User { name: `Suzanne`, email: `suzanne@acme.corp` },
  User { name: `Bob`, email: `bob@acme.corp` },
]

const someResult = AuthResult.Authenticated(User { name: `Suzanne`, email: `suzanne@acme.corp` }), `some_auth_token`)
```

### Records & Enums

```ts
import Log

type User = { name: String }

const hello = (person: User) => Log.println(`Hello ${person.name}`)

enum Color {
  White,
  Black,
  Brown,
}

enum Animal {
  Dog({ color: Color }),
  Bird({ isFlightless: Boolean }),
  Fish(Number),
}

const me = { name: `Octocat` }
hello(me)
const lady = Animal.Dog({ color: Color.White }) 
const goldie = Animal.Fish(2)

```

