/**
 * A fundamental interface representing a computational unit that can be transformed
 * and composed using functional programming patterns.
 *
 * The Unit interface provides three core operations: map, apply, and andThen (flatMap),
 * which form the basis of a monad-like structure for functional composition.
 *
 * @template Primitive The type of value contained within this unit
 *
 * @example
 * ```typescript
 * // Example implementation
 * class MyUnit<T> implements Unit<T> {
 *   constructor(private _value: T) {}
 *
 *   get value(): T { return this._value; }
 *
 *   map<U>(fn: (value: T) => U): Unit<U> {
 *     return new MyUnit(fn(this._value));
 *   }
 *
 *   // ... other methods
 * }
 * ```
 */
export interface Unit<Primitive> {
	/**
	 * Transforms the value inside this unit using the provided function.
	 * This is a functor operation that applies a function to the wrapped value
	 * while preserving the unit structure.
	 *
	 * @template Out The type of the transformed value
	 * @param fn Function to transform the contained value
	 * @returns A new unit containing the transformed value
	 *
	 * @example
	 * ```typescript
	 * const optional = Some(5);
	 * const doubled = optional.map(x => x * 2); // Some(10)
	 * ```
	 */
	map<Out = unknown>(fn: (value: Primitive) => Out): Unit<Out>;

	/**
	 * Applies a function wrapped in a unit to the value in this unit.
	 * This is an applicative operation that allows for function application
	 * within the context of units.
	 *
	 * @template Out The return type of the applied function
	 * @param fn A unit containing a function to apply to this unit's value
	 * @returns A new unit containing the result of applying the function
	 *
	 * @example
	 * ```typescript
	 * const value = Some(5);
	 * const fn = Some((x: number) => x * 2);
	 * const result = value.apply(fn); // Some(10)
	 * ```
	 */
	apply<Out>(fn: Unit<(value: Primitive) => Out>): Unit<Out>;

	/**
	 * Chains computations by applying a function that returns a new unit.
	 * This is a monadic bind operation (also known as flatMap) that prevents
	 * nested unit structures.
	 *
	 * @template Out The type contained in the returned unit
	 * @param fn Function that takes the current value and returns a new unit
	 * @returns The unit returned by the function, avoiding nesting
	 *
	 * @example
	 * ```typescript
	 * const optional = Some(5);
	 * const result = optional.andThen(x => x > 0 ? Some(x * 2) : None()); // Some(10)
	 * ```
	 */
	andThen<Out>(fn: (value: Primitive) => Unit<Out>): Unit<Out>;

	/**
	 * The value contained within this unit.
	 *
	 * @throws May throw an error if the unit is in an invalid state (e.g., None, Err)
	 */
	value: Primitive;

	/**
	 * Returns a string representation of this unit for debugging and logging purposes.
	 *
	 * @returns A human-readable string describing this unit and its contents
	 */
	toString(): string;
}
