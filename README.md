<h1 align="center">Fyg</h1>

<p align="center"><strong>Fyg</strong> is a high-level, general purpose programming language for production. It's heavily inspired by the simplistic and cohesive qualities of Go, but brings additional type safety/joy.</p>

> _Note:_ Fyg is still being built! So it's not acutally ready for production yet 😅

Fyg's primary goal is to make collaborative development on application codebases more efficient. It is designed to speed up the process of integrating useful features into production, while also minimizing bugs, reducing maintenance effort, and lessening developer frustration.

### Goals

- Simple as can be: only one way to do things where possible
- A fun and sound type system that deters perfectionism
- Escape hatches to get started quickly
- Cohesive DX. One CLI for builds, package management, formatting, testing, LSP, etc
- Brand new ecosystem, no clunky interop or legacy systems
- No options/config
- Fantastic standard library to reduce dependency nightmares

### Language features

- Functional and expression oriented
- Deeply immutable data structures as standard
- Sound type system that doesn't bog you down
- Pattern matching with a `match` expression
- Support imperative programming

---

## Overview

- All values names are pascalCase
- All type name as PascalCase

### Basics

The `const` keyword is the only type of "variable". The can never be reassigned or shadow.

```ts
const name: String = `world`

// types are also inferred
const hello = `Hello ${name}!`

// one primary type for all number, the classic float64
const magicNumber = 14.75 + 42

// but you can use underscores as arbitrary separators if you like
const longNumber = 1_234_567.89
```

_Note: a `mutable` alternative is under consideration._

### Control flow

Match expression are pretty straight-forward. I'm still trying to figure the if/else expression syntax out.

```ts
// all modules have to be imported at the start of a file
import Log 
import Http

const result = Http.makeRequest(`https://api.awesome.sauce/my-name`)

// Basic types, including Result & Option are implicitly imported
const responseText = match (result) {
  Ok(response) -> response.text
  Err -> `Request failed`
}

// playing with ideas for if/else
// - needs to have one-style only
// - concise enough to not require ternary syntax
const name = if (String.length(responseText) < 12) name else { `world` }
Log.println(`Hello ${name}!`)

// This is cool
if x == 1 -> "one"
   y == 2 -> "two"
   else   -> "three"

// Syntax is weird for blocks though
if x == 1 -> {
  "good job x"
} else -> {
  "otherwise"
}

// Single branch expression, evaulates to Void?
if (foo) {
  bar()
}
```

There is no special iteration syntax (e.g. `for` or `while`). Use `Array` instead:

```ts
import Array
import Log expose (println)

const numbers = [1, 2, 3, 4]
const doubled = numbers |> Array.map(n => n * 2)
doubled |> Array.forEach(println)
```

### Union types

```ts
import Log expose (println)

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

println(getSound(Animal.Cat))

// Note: Pipe operator is under consideration
Animal.Cat |> getSound() |> println()


// Note: Enum values be hoisted up is under consideration
getSound(Dog) // like this, no `Animal` prefix

// enum values can be used as types too
const doWoof = (dog: Animal.Dog) => `Dog goes WOOF!`
```

### Custom types

You can define your own types

```ts
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

const someResult = AuthResult.Authenticated(User({ name: `Suzanne`, email: `suzanne@acme.corp` }), "some_auth_token")
```


### Records & Enums

```ts
// FYG
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

const me = { name: `Andrew` }
hello(me)
const lady = Dog({ color: Color.White }) 
const goldie = Fish(2)

```

