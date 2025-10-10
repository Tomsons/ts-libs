import { Maybe, type Optional } from './optional.js';
import type { Unit } from './unit.js';

/**
 * Creates a Result representing an error.
 *
 * @template E The type of the error
 * @param error The error value
 * @returns A Result containing the error
 *
 * @example
 * ```typescript
 * const error = Err("Something went wrong");
 * console.log(error.isErr()); // true
 * console.log(error.error); // "Something went wrong"
 * ```
 */
export const Err = <E extends unknown>(error: E) => Result.err<never, E>(error);

/**
 * Creates a Result representing a successful value.
 *
 * @template T The type of the success value
 * @param value The success value
 * @returns A Result containing the value
 *
 * @example
 * ```typescript
 * const success = Ok(42);
 * console.log(success.isOk()); // true
 * console.log(success.value); // 42
 * ```
 */
export const Ok = <T>(value: T) => Result.ok<T>(value);

/**
 * Represents the result of an operation that can either succeed with a value or fail with an error.
 *
 * Result is a type-safe way to handle operations that might fail, eliminating the need
 * for exception throwing and catching. It implements the Unit interface for functional
 * composition and provides railway-oriented programming patterns.
 *
 * @template T The type of the success value
 * @template E The type of the error value
 *
 * @example
 * ```typescript
 * // Creating results
 * const success = Result.ok(42);
 * const failure = Result.err("Something went wrong");
 *
 * // Chaining operations (railway-oriented programming)
 * const result = parseNumber("42")
 *   .map(n => n * 2)
 *   .andThen(n => n > 50 ? Result.ok(n) : Result.err("Too small"));
 *
 * // Safe value extraction
 * const finalValue = result.unwrapOr(0); // Get value or default
 * ```
 */
export class Result<T, E extends unknown = Error> implements Unit<T> {
	private constructor(private readonly inner: { type: 'ok'; value: T } | { type: 'err'; error: E }) {}

	/**
	 * Creates a successful Result containing the provided value.
	 *
	 * @template T The type of the success value
	 * @template E The type of potential errors (defaults to never)
	 * @param value The success value
	 * @returns A Result representing success
	 *
	 * @example
	 * ```typescript
	 * const result = Result.ok(42);
	 * console.log(result.isOk()); // true
	 * console.log(result.value); // 42
	 * ```
	 */
	static ok<T>(value: T): Result<T, any | never> {
		return new Result<T, any | never>({ type: 'ok', value });
	}

	/**
	 * Creates a failed Result containing the provided error.
	 *
	 * @template T The type of potential success values (defaults to never)
	 * @template E The type of the error
	 * @param error The error value
	 * @returns A Result representing failure
	 *
	 * @example
	 * ```typescript
	 * const result = Result.err("Network error");
	 * console.log(result.isErr()); // true
	 * console.log(result.error); // "Network error"
	 * ```
	 */
	static err<T = never, E extends Error | string | number | any = Error>(error: E): Result<T, E> {
		return new Result<T, E>({ type: 'err', error });
	}

	/**
	 * Checks if this Result represents success.
	 *
	 * @returns true if this Result contains a success value
	 *
	 * @example
	 * ```typescript
	 * Result.ok(42).isOk(); // true
	 * Result.err("error").isOk(); // false
	 * ```
	 */
	isOk(): boolean {
		return this.inner.type === 'ok';
	}

	/**
	 * Checks if this Result represents failure.
	 *
	 * @returns true if this Result contains an error
	 *
	 * @example
	 * ```typescript
	 * Result.ok(42).isErr(); // false
	 * Result.err("error").isErr(); // true
	 * ```
	 */
	isErr(): boolean {
		return this.inner.type === 'err';
	}

	/**
	 * Gets the success value from this Result.
	 *
	 * @returns The contained success value
	 * @throws Error if this Result represents failure
	 *
	 * @example
	 * ```typescript
	 * const success = Result.ok(42);
	 * console.log(success.value); // 42
	 *
	 * const failure = Result.err("error");
	 * console.log(failure.value); // Throws Error
	 * ```
	 */
	get value(): T {
		if (this.isErr()) {
			throw new Error('Cannot get value from an Err result');
		}
		return (this.inner as { type: 'ok'; value: T }).value;
	}

	/**
	 * Gets the error value from this Result.
	 *
	 * @returns The contained error value
	 * @throws Error if this Result represents success
	 *
	 * @example
	 * ```typescript
	 * const failure = Result.err("Something went wrong");
	 * console.log(failure.error); // "Something went wrong"
	 *
	 * const success = Result.ok(42);
	 * console.log(success.error); // Throws Error
	 * ```
	 */
	get error(): E {
		if (this.isOk()) {
			throw new Error('Cannot get error from an Ok result');
		}
		return (this.inner as { type: 'err'; error: E }).error;
	}

	/**
	 * Transforms the success value using the provided function.
	 * If this Result is an error, returns the error unchanged.
	 *
	 * @template U The type of the transformed value
	 * @param fn Function to transform the success value
	 * @returns A new Result with the transformed value, or the original error
	 *
	 * @example
	 * ```typescript
	 * Result.ok(5).map(x => x * 2); // Ok(10)
	 * Result.err("error").map(x => x * 2); // Err("error")
	 * ```
	 */
	map<U>(fn: (value: T) => U): Unit<U> {
		if (this.isOk()) {
			return Result.ok<U>(fn(this.value));
		}
		return Result.err<U, E>(this.error);
	}

	/**
	 * Applies a function wrapped in a Result to the value in this Result.
	 * If either Result is an error, returns the first error encountered.
	 *
	 * @template U The return type of the applied function
	 * @param fn A Result containing a function to apply
	 * @returns A new Result with the applied function result, or the first error
	 *
	 * @example
	 * ```typescript
	 * const value = Result.ok(5);
	 * const fn = Result.ok((x: number) => x * 2);
	 * value.apply(fn); // Ok(10)
	 *
	 * const errorFn = Result.err("function error");
	 * value.apply(errorFn); // Err("function error")
	 * ```
	 */
	apply<U>(fn: Result<(value: T) => U, E>): Unit<U> {
		if (this.isOk() && fn.isOk()) {
			return Result.ok<U>(fn.value(this.value));
		}
		return this.isErr() ? Result.err<U, E>(this.error) : Result.err<U, E>(fn.error);
	}

	/**
	 * Chains Result computations, preventing nested Result structures.
	 * If this Result is an error, returns the error without calling the function.
	 *
	 * @template U The type of the success value in the returned Result
	 * @param fn Function that takes the current value and returns a new Result
	 * @returns The Result returned by the function, or the original error
	 *
	 * @example
	 * ```typescript
	 * const divide = (a: number, b: number): Result<number, string> =>
	 *   b === 0 ? Result.err("Division by zero") : Result.ok(a / b);
	 *
	 * Result.ok(10)
	 *   .andThen(x => divide(x, 2)) // Ok(5)
	 *   .andThen(x => divide(x, 0)); // Err("Division by zero")
	 * ```
	 */
	andThen<U>(fn: (value: T) => Result<U, E>): Unit<U> {
		if (this.isOk()) {
			return fn(this.value);
		}
		return Result.err<U, E>(this.error);
	}

	/**
	 * Returns a string representation of this Result.
	 *
	 * @returns "Ok(value)" for success Results, or "Err(error)" for error Results
	 *
	 * @example
	 * ```typescript
	 * Result.ok(42).toString(); // "Ok(42)"
	 * Result.err("error").toString(); // "Err(error)"
	 * ```
	 */
	toString(): string {
		return this.isOk() ? `Ok(${this.value})` : `Err(${this.error})`;
	}

	/**
	 * Extracts the success value or returns a default value if this is an error.
	 *
	 * @param defaultValue The value to return if this Result is an error
	 * @returns The success value or the provided default
	 *
	 * @example
	 * ```typescript
	 * Result.ok(42).unwrapOr(0); // 42
	 * Result.err("error").unwrapOr(0); // 0
	 * ```
	 */
	public unwrapOr(defaultValue: T): T {
		return this.isOk() ? this.value : defaultValue;
	}

	/**
	 * Extracts the success value or throws an error if this Result represents failure.
	 *
	 * @returns The success value
	 * @throws Error containing the error message if this is a failure Result
	 *
	 * @example
	 * ```typescript
	 * Result.ok(42).unwrap(); // 42
	 * Result.err("Something went wrong").unwrap(); // Throws Error
	 * ```
	 */
	public unwrap(): T {
		if (this.isOk()) {
			return this.value;
		}
		throw new Error(`Called unwrap on an Err value: ${this.error}`);
	}

	/**
	 * Converts this Result to an Optional.
	 * Success Results become Some, error Results become None.
	 *
	 * @returns An Optional containing the success value, or None for errors
	 *
	 * @example
	 * ```typescript
	 * Result.ok(42).asOptional(); // Some(42)
	 * Result.err("error").asOptional(); // None()
	 * ```
	 */
	public asOptional(): Optional<T> {
		return Maybe(this.isOk() ? this.value : null);
	}
}
