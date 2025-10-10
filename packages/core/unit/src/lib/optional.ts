import type { Unit } from './unit.js';

/**
 * Creates an empty Optional (None).
 *
 * @template T The type that would be contained if the Optional had a value
 * @returns An Optional representing no value
 *
 * @example
 * ```typescript
 * const empty = None<string>(); // Optional<string> with no value
 * console.log(empty.isNone()); // true
 * ```
 */
export const None = <T>() => Optional.none<T>();

/**
 * Creates an Optional containing the provided value.
 *
 * @template T The type of the value to wrap
 * @param value The non-null, non-undefined value to wrap
 * @returns An Optional containing the value
 * @throws Error if value is null or undefined
 *
 * @example
 * ```typescript
 * const some = Some("hello"); // Optional<string> containing "hello"
 * console.log(some.isSome()); // true
 * console.log(some.value); // "hello"
 * ```
 */
export const Some = <T>(value: T) => Optional.some(value);

/**
 * Creates an Optional from a potentially null or undefined value.
 *
 * @template T The type of the value
 * @param value The value that might be null or undefined
 * @returns Some(value) if value is not null/undefined, otherwise None()
 *
 * @example
 * ```typescript
 * const some = Maybe("hello"); // Some("hello")
 * const none = Maybe(null); // None()
 * const none2 = Maybe(undefined); // None()
 * ```
 */
export const Maybe = <T>(value: T | null | undefined) => Optional.fromNullable(value);

/**
 * Represents an optional value that may or may not be present.
 *
 * Optional is a type-safe way to handle nullable values, eliminating the need
 * for null checks and reducing the likelihood of null pointer exceptions.
 * It implements the Unit interface, providing functional composition capabilities.
 *
 * @template T The type of value that may be contained
 *
 * @example
 * ```typescript
 * // Creating optionals
 * const some = Optional.some("hello");
 * const none = Optional.none<string>();
 * const maybe = Optional.fromNullable(getValue()); // null-safe creation
 *
 * // Chaining operations
 * const result = some
 *   .map(s => s.toUpperCase())
 *   .andThen(s => s.length > 3 ? Optional.some(s) : Optional.none());
 * ```
 */
export class Optional<T> implements Unit<T> {
	private constructor(private readonly inner: T | null) {}

	/**
	 * Creates an Optional containing the provided value.
	 *
	 * @template T The type of the value
	 * @param value The non-null, non-undefined value to wrap
	 * @returns An Optional containing the value
	 * @throws Error if value is null or undefined
	 *
	 * @example
	 * ```typescript
	 * const opt = Optional.some(42); // Contains 42
	 * console.log(opt.value); // 42
	 * ```
	 */
	static some<T>(value: T): Optional<T> {
		if (value === null || value === undefined) {
			throw new Error('Cannot create an Optional with a null or undefined value. Use Optional.none() instead.');
		}
		return new Optional(value);
	}

	/**
	 * Creates an empty Optional representing no value.
	 *
	 * @template T The type that would be contained if there was a value
	 * @returns An empty Optional
	 *
	 * @example
	 * ```typescript
	 * const empty = Optional.none<number>();
	 * console.log(empty.isNone()); // true
	 * ```
	 */
	static none<T>(): Optional<T> {
		return new Optional<T>(null);
	}

	/**
	 * Creates an Optional from a potentially null or undefined value.
	 *
	 * @template T The type of the value
	 * @param value The value that might be null or undefined
	 * @returns Some(value) if value is not null/undefined, otherwise None()
	 *
	 * @example
	 * ```typescript
	 * const opt1 = Optional.fromNullable("hello"); // Some("hello")
	 * const opt2 = Optional.fromNullable(null); // None()
	 * const opt3 = Optional.fromNullable(undefined); // None()
	 * ```
	 */
	static fromNullable<T>(value?: T | null | undefined): Optional<T> {
		return value === null || value === undefined ? Optional.none<T>() : Optional.some(value);
	}

	/**
	 * Gets the contained value.
	 *
	 * @returns The contained value, or null/undefined if none exists
	 * @throws Error if accessed on a None optional (when using strict access patterns)
	 */
	get value(): T {
		if (this.isNone()) {
			throw new Error('Cannot access the value of a None Optional. Check isSome() before accessing value.');
		}
		return this.inner as T;
	}

	/**
	 * Checks if this Optional contains a value.
	 *
	 * @returns true if this Optional contains a non-null, non-undefined value
	 *
	 * @example
	 * ```typescript
	 * Optional.some(42).isSome(); // true
	 * Optional.none().isSome(); // false
	 * ```
	 */
	public isSome(): boolean {
		return this.inner !== null && this.inner !== undefined;
	}

	/**
	 * Checks if this Optional is empty.
	 *
	 * @returns true if this Optional contains no value (null or undefined)
	 *
	 * @example
	 * ```typescript
	 * Optional.some(42).isNone(); // false
	 * Optional.none().isNone(); // true
	 * ```
	 */
	public isNone(): boolean {
		return this.inner === null || this.inner === undefined;
	}

	/**
	 * Transforms the contained value using the provided function.
	 * If this Optional is None, returns None without calling the function.
	 *
	 * @template U The type of the transformed value
	 * @param fn Function to transform the contained value
	 * @returns A new Optional containing the transformed value, or None if this is None
	 *
	 * @example
	 * ```typescript
	 * Optional.some(5).map(x => x * 2); // Some(10)
	 * Optional.none<number>().map(x => x * 2); // None()
	 * ```
	 */
	public map<U>(fn: (value: T) => U): Optional<U> {
		if (this.isNone()) {
			return Optional.none() as Optional<U>;
		}
		const out = fn(this.inner as T);
		return Optional.fromNullable(out as U) as Unit<U> as Optional<U>;
	}

	/**
	 * Applies a function wrapped in an Optional to the value in this Optional.
	 * If either this Optional or the function Optional is None, returns None.
	 *
	 * @template U The return type of the applied function
	 * @param fn An Optional containing a function to apply
	 * @returns A new Optional containing the result, or None if either Optional is None
	 *
	 * @example
	 * ```typescript
	 * const value = Optional.some(5);
	 * const fn = Optional.some((x: number) => x * 2);
	 * value.apply(fn); // Some(10)
	 * ```
	 */
	public apply<U>(fn: Unit<(value: T) => U>): Unit<U> {
		if (this.isNone() || (fn instanceof Optional && fn.isNone())) {
			return Optional.none<U>() as Unit<U>;
		}
		return Optional.fromNullable(fn.value(this.inner as T)) as Unit<U>;
	}

	/**
	 * Chains Optional computations, preventing nested Optional structures.
	 * If this Optional is None, returns None without calling the function.
	 *
	 * @template U The type contained in the returned Optional
	 * @param fn Function that takes the current value and returns a new Optional
	 * @returns The Optional returned by the function, or None if this is None
	 *
	 * @example
	 * ```typescript
	 * Optional.some(5)
	 *   .andThen(x => x > 0 ? Optional.some(x * 2) : Optional.none()); // Some(10)
	 *
	 * Optional.none<number>()
	 *   .andThen(x => Optional.some(x * 2)); // None()
	 * ```
	 */
	public andThen<U>(fn: (value: T) => Unit<U>): Unit<U> {
		if (this.isNone()) {
			return Optional.none() as Unit<U>;
		}
		return fn(this.inner as T);
	}

	/**
	 * Returns a string representation of this Optional.
	 *
	 * @returns "Optional.none" for empty Optionals, or "Optional.some(value)" for non-empty ones
	 *
	 * @example
	 * ```typescript
	 * Optional.some(42).toString(); // "Optional.some(42)"
	 * Optional.none().toString(); // "Optional.none"
	 * ```
	 */
	public toString(): string {
		return this.isNone() ? 'Optional.none' : `Optional.some(${this.inner})`;
	}
}
