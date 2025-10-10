# fp-utils

A TypeScript functional programming utilities library that provides type-safe currying and other functional programming primitives later.

## Installation

```bash
npm install @tomsons/fp-utils
# or
pnpm add @tomsons/fp-utils
# or
yarn add @tomsons/fp-utils
```

## Features

- **Type-Safe Currying**: Transform multi-parameter functions into curried functions with full TypeScript type inference
- **Partial Application**: Support for both single-parameter currying and multi-parameter partial application
- **Zero Dependencies**: Lightweight library with no external dependencies
- **Full TypeScript Support**: Complete type safety throughout the currying chain

## API Reference

### `curryfy<T>(fn: T): CurriedFunction<T>`

Transforms a function with multiple parameters into a curried function that can be called with one argument at a time, maintaining full type safety throughout the currying chain.

#### Parameters

- `fn` - The function to curry. Must be a function with a fixed number of parameters.

#### Returns

A curried version of the input function that can be called one parameter at a time.

## Usage Examples

### Basic Currying

```typescript
import { curryfy } from '@tomsons/fp-utils';

// Simple addition function
const add = (a: number, b: number, c: number) => a + b + c;
const curriedAdd = curryfy(add);

// Call with one argument at a time
const result = curriedAdd(1)(2)(3); // 6

// Or store intermediate functions
const addOne = curriedAdd(1);
const addOneAndTwo = addOne(2);
const finalResult = addOneAndTwo(3); // 6
```

### Practical Example: Calculator

```typescript
import { curryfy } from '@tomsons/fp-utils';

const calculator = (operation: string, a: number, b: number): number => {
  switch (operation) {
    case 'add': return a + b;
    case 'multiply': return a * b;
    case 'subtract': return a - b;
    case 'divide': return a / b;
    default: return 0;
  }
};

const curriedCalc = curryfy(calculator);

// Create specialized functions
const adder = curriedCalc('add');
const multiplier = curriedCalc('multiply');

console.log(adder(5)(3)); // 8
console.log(multiplier(4)(3)); // 12

// Reuse the same partially applied function
console.log(adder(10)(2)); // 12
console.log(adder(7)(8)); // 15
```

### String Formatting

```typescript
import { curryfy } from '@tomsons/fp-utils';

const formatter = (prefix: string, value: any, suffix: string) => 
  `${prefix}${value}${suffix}`;

const curriedFormatter = curryfy(formatter);

// Create specialized formatters
const bracketFormatter = curriedFormatter('[');
const braceFormatter = curriedFormatter('{');

console.log(bracketFormatter(42)(']')); // "[42]"
console.log(braceFormatter('hello')('}')); // "{hello}"

// Create even more specialized functions
const arrayFormatter = bracketFormatter;
const objFormatter = braceFormatter;

console.log(arrayFormatter('item1')(']')); // "[item1]"
console.log(objFormatter('key: value')('}')); // "{key: value}"
```

### Working with Mixed Types

```typescript
import { curryfy } from '@tomsons/fp-utils';

interface User {
  id: number;
  name: string;
  active: boolean;
}

const createUserMessage = (greeting: string, user: User, punctuation: string) =>
  `${greeting}, ${user.name}${punctuation} Your ID is ${user.id} and you are ${user.active ? 'active' : 'inactive'}.`;

const curriedMessage = curryfy(createUserMessage);

// Create greeting templates
const welcomeMessage = curriedMessage('Welcome');
const helloMessage = curriedMessage('Hello');

const user: User = { id: 123, name: 'Alice', active: true };

console.log(welcomeMessage(user)('!')); 
// "Welcome, Alice! Your ID is 123 and you are active."

console.log(helloMessage(user)('.'));
// "Hello, Alice. Your ID is 123 and you are active."
```

### Complex Data Processing

```typescript
import { curryfy } from '@tomsons/fp-utils';

const processData = (
  transformer: (x: number) => number,
  filter: (x: number) => boolean,
  data: number[]
) => data.filter(filter).map(transformer);

const curriedProcess = curryfy(processData);

// Create specialized processors
const doublePositives = curriedProcess(x => x * 2)(x => x > 0);
const squareEvens = curriedProcess(x => x ** 2)(x => x % 2 === 0);

console.log(doublePositives([1, -2, 3, -4, 5])); // [2, 6, 10]
console.log(squareEvens([1, 2, 3, 4, 5, 6])); // [4, 16, 36]
```

### Runtime Partial Application

While TypeScript enforces single-parameter currying for type safety, the runtime behavior supports partial application with multiple arguments:

```typescript
import { curryfy } from '@tomsons/fp-utils';

const add4 = (a: number, b: number, c: number, d: number) => a + b + c + d;
const curriedAdd4 = curryfy(add4) as any; // Type assertion for runtime behavior

// All of these produce the same result:
console.log(curriedAdd4(1)(2)(3)(4));     // 10 - single args
console.log(curriedAdd4(1, 2)(3, 4));     // 10 - partial application
console.log(curriedAdd4(1, 2, 3)(4));     // 10 - partial application
console.log(curriedAdd4(1, 2, 3, 4));     // 10 - all args at once
```

## Advanced Usage

### Function Composition with Currying

```typescript
import { curryfy } from '@tomsons/fp-utils';

const pipe = <T>(...fns: Array<(arg: T) => T>) => (value: T) =>
  fns.reduce((acc, fn) => fn(acc), value);

const multiply = (factor: number, value: number) => value * factor;
const add = (addend: number, value: number) => value + addend;

const curriedMultiply = curryfy(multiply);
const curriedAdd = curryfy(add);

// Create a processing pipeline
const processNumber = pipe(
  curriedMultiply(2),    // double the number
  curriedAdd(10),        // add 10
  curriedMultiply(0.5)   // halve the result
);

console.log(processNumber(5)); // ((5 * 2) + 10) * 0.5 = 10
```

### Creating Configuration-based Functions

```typescript
import { curryfy } from '@tomsons/fp-utils';

interface Config {
  prefix: string;
  suffix: string;
  transform: (s: string) => string;
}

const configurableFormatter = (config: Config, input: string) =>
  `${config.prefix}${config.transform(input)}${config.suffix}`;

const curriedFormatter = curryfy(configurableFormatter);

// Create different formatters with different configurations
const upperFormatter = curriedFormatter({
  prefix: '>>> ',
  suffix: ' <<<',
  transform: s => s.toUpperCase()
});

const lowerFormatter = curriedFormatter({
  prefix: '[ ',
  suffix: ' ]',
  transform: s => s.toLowerCase()
});

console.log(upperFormatter('Hello World')); // ">>> HELLO WORLD <<<"
console.log(lowerFormatter('Hello World')); // "[ hello world ]"
```

## Type Safety

The curryfy function provides complete type safety throughout the currying chain:

```typescript
import { curryfy } from '@tomsons/fp-utils';

const typedFunction = (str: string, num: number, bool: boolean) => ({
  string: str.toUpperCase(),
  number: num * 2,
  boolean: !bool
});

const curried = curryfy(typedFunction);

// TypeScript knows the exact type at each step:
const step1 = curried('hello');        // (num: number) => (bool: boolean) => Result
const step2 = step1(42);               // (bool: boolean) => Result
const result = step2(true);            // Result

// TypeScript will catch type errors:
// const error = curried(123);         // ❌ Error: Expected string, got number
// const error2 = step1('invalid');    // ❌ Error: Expected number, got string
```

## Important Notes

### Function Length and Default Parameters

The curryfy function uses `fn.length` to determine when all required parameters have been provided. This means:

```typescript
// This function has length 1 (only counts required parameters)
const withDefaults = (a: number, b: number = 10, c: number = 20) => a + b + c;
const curriedDefaults = curryfy(withDefaults);

console.log(curriedDefaults(5)); // 35 (5 + 10 + 20)
// Only curries the first parameter since others have defaults
```

### Rest Parameters

Functions with rest parameters are not suitable for currying since they don't have a fixed arity:

```typescript
// This works but only curries the fixed parameters
const sumWithRest = (a: number, b: number, ...rest: number[]) => 
  a + b + rest.reduce((sum, val) => sum + val, 0);

const curriedSum = curryfy(sumWithRest);
console.log(curriedSum(1)(2)); // 3 (rest parameters ignored in currying)
```

## Building

Run `nx build fp-utils` to build the library.

## Running unit tests

Run `nx test fp-utils` to execute the unit tests via [Vitest](https://vitest.dev/).

## License

MIT License - see LICENSE file for details.
