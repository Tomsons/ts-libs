# @tomson/unit

A comprehensive functional programming library providing type-safe primitives for composable computations. This library implements common functional programming patterns including Optional (Maybe), Result (Either), and Task monads with a unified Unit interface.

## Features

- 🛡️ **Type Safety**: Full TypeScript support with comprehensive type definitions
- 🔗 **Composable**: Unified Unit interface enabling functional composition patterns
- 🚫 **Zero Dependencies**: No external dependencies for maximum compatibility
- 🎯 **Focused**: Each primitive serves a specific purpose in functional programming
- 📚 **Well Documented**: Comprehensive TSDoc documentation and examples

## Installation

### npm
```bash
npm install @tomson/unit
```

### yarn
```bash
yarn add @tomson/unit
```

### pnpm
```bash
pnpm add @tomson/unit
```

## Core Concepts

### Unit Interface

The `Unit<T>` interface is the foundation of this library, providing three core operations:

- `map<U>(fn: (value: T) => U): Unit<U>` - Transform the contained value
- `apply<U>(fn: Unit<(value: T) => U>): Unit<U>` - Apply a wrapped function
- `andThen<U>(fn: (value: T) => Unit<U>): Unit<U>` - Chain computations (flatMap)

## API Reference

### Optional<T>

Represents a value that may or may not be present, eliminating null pointer exceptions.

#### Creation
```typescript
import { Optional, Some, None, Maybe } from '@tomson/unit';

// Direct creation
const some = Optional.some(42);           // Contains 42
const none = Optional.none<number>();     // Empty Optional

// Factory functions
const some2 = Some(42);                   // Contains 42
const none2 = None<number>();             // Empty Optional

// Null-safe creation
const maybe1 = Maybe("hello");            // Some("hello")
const maybe2 = Maybe(null);               // None()
const maybe3 = Maybe(undefined);          // None()
```

#### Methods
- `isSome(): boolean` - Check if contains a value
- `isNone(): boolean` - Check if empty
- `map<U>(fn: (value: T) => U): Optional<U>` - Transform value if present
- `andThen<U>(fn: (value: T) => Optional<U>): Optional<U>` - Chain operations
- `apply<U>(fn: Optional<(value: T) => U>): Optional<U>` - Apply wrapped function

#### Examples
```typescript
// Basic usage
const user = Some({ name: "John", age: 30 });
const upperName = user
  .map(u => u.name.toUpperCase())          // Some("JOHN")
  .andThen(name => name.length > 3 ? Some(name) : None()); // Some("JOHN")

// Null-safe operations
const getValue = (): string | null => Math.random() > 0.5 ? "value" : null;
const result = Maybe(getValue())
  .map(v => v.toUpperCase())
  .map(v => `Result: ${v}`);

console.log(result.isSome() ? result.value : "No value");
```

### Result<T, E>

Represents the result of an operation that can either succeed or fail, enabling railway-oriented programming.

#### Creation
```typescript
import { Result, Ok, Err } from '@tomson/unit';

// Direct creation
const success = Result.ok(42);                    // Success with value 42
const failure = Result.err("Something failed");   // Failure with error

// Factory functions
const success2 = Ok(42);                          // Success with value 42
const failure2 = Err("Something failed");         // Failure with error
```

#### Methods
- `isOk(): boolean` - Check if represents success
- `isErr(): boolean` - Check if represents failure
- `unwrap(): T` - Get value (throws if error)
- `unwrapOr(defaultValue: T): T` - Get value or default
- `asOptional(): Optional<T>` - Convert to Optional
- `map<U>(fn: (value: T) => U): Result<U, E>` - Transform success value
- `andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E>` - Chain operations

#### Examples
```typescript
// Basic usage
const divide = (a: number, b: number): Result<number, string> => 
  b === 0 ? Err("Division by zero") : Ok(a / b);

const pipeline = divide(10, 2)
  .map(x => x * 2)                    // Ok(10)
  .andThen(x => divide(x, 5));        // Ok(2)

console.log(pipeline.unwrapOr(0));   // 2

// Error handling
const parseNumber = (str: string): Result<number, string> => {
  const num = parseInt(str);
  return isNaN(num) ? Err("Not a number") : Ok(num);
};

const result = parseNumber("42")
  .map(n => n * 2)
  .andThen(n => n > 50 ? Ok(n) : Err("Too small"));

if (result.isOk()) {
  console.log("Success:", result.value);
} else {
  console.error("Error:", result.error);
}
```

### Task<T>

Represents an asynchronous computation with functional composition capabilities and automatic error handling.

#### Creation
```typescript
import { Task } from '@tomson/unit';

// Create from Promise-returning function
const fetchTask = Task.of(() => fetch('/api/data').then(r => r.json()));
const computeTask = Task.of(async () => {
  const result = await heavyComputation();
  return result * 2;
});
```

#### Methods
- `run(): Promise<Result<T, Error>>` - Execute the task
- `asOptional(): Promise<Optional<T>>` - Execute and convert to Optional
- `map<U>(fn: (value: T) => U): Task<U>` - Transform result
- `andThen<U>(fn: (value: T) => Task<U>): Task<U>` - Chain tasks
- `apply<U>(fn: Task<(value: T) => U>): Task<U>` - Apply wrapped function

#### Examples
```typescript
// Basic usage
const fetchUser = Task.of(() => 
  fetch('/api/user/123').then(response => response.json())
);

const fetchProfile = (user: User) => Task.of(() =>
  fetch(`/api/profile/${user.id}`).then(response => response.json())
);

// Chaining tasks
const pipeline = fetchUser
  .map(user => ({ ...user, name: user.name.toUpperCase() }))
  .andThen(fetchProfile);

// Execute the pipeline
const result = await pipeline.run();
if (result.isOk()) {
  console.log('Profile:', result.value);
} else {
  console.error('Error:', result.error.message);
}

// Parallel execution with apply
const task1 = Task.of(() => Promise.resolve(5));
const task2 = Task.of(() => Promise.resolve((x: number) => x * 2));

const combined = task1.apply(task2); // Will produce 10
const result2 = await combined.run();
```

## Advanced Patterns

### Composing Different Types
```typescript
import { Some, Ok, Task, Maybe } from '@tomson/unit';

// Convert between types
const optional = Some(42);
const result = Ok(optional.value);
const task = Task.of(() => Promise.resolve(result.value));

// Chain different monads
const processUser = (id: string) =>
  Task.of(() => fetchUser(id))
    .andThen(user => 
      Maybe(user.email).isSome() 
        ? Task.of(() => sendEmail(user.email))
        : Task.of(() => Promise.reject(new Error("No email")))
    );
```

### Error Recovery Patterns
```typescript
// Result with fallback
const withFallback = parseNumber("invalid")
  .andThen(n => Ok(n * 2))
  .unwrapOr(0); // Returns 0 instead of failing

// Task with retry logic
const retryTask = <T>(task: Task<T>, maxRetries: number): Task<T> =>
  Task.of(async () => {
    let lastError: Error;
    for (let i = 0; i <= maxRetries; i++) {
      const result = await task.run();
      if (result.isOk()) return result.value;
      lastError = result.error;
    }
    throw lastError!;
  });
```

## Factory Functions

For convenience, all factory functions are also available through the `UnitFactories` object:

```typescript
import { UnitFactories } from '@tomson/unit';

const optional = UnitFactories.Optional.some(42);
const result = UnitFactories.Result.ok("success");
const task = UnitFactories.Task.of(() => Promise.resolve(100));
```

## TypeScript Support

This library is written in TypeScript and provides comprehensive type definitions:

```typescript
// Type inference works seamlessly
const result = Some(42)
  .map(x => x.toString())        // Optional<string>
  .andThen(s => Some(s.length)); // Optional<number>

// Generic type parameters
const parseJSON = <T>(json: string): Result<T, string> => {
  try {
    return Ok(JSON.parse(json) as T);
  } catch (error) {
    return Err(`Invalid JSON: ${error.message}`);
  }
};

interface User {
  id: number;
  name: string;
}

const user = parseJSON<User>('{"id": 1, "name": "John"}');
```

## Contributing

This library is part of the Tomson's open-source monorepo. See the main repository README for contribution guidelines.

## License

MIT License - see the main repository for details.
