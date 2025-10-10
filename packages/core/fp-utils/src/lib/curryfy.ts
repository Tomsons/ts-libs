type Curry<T extends readonly unknown[], R> = T extends readonly [infer H, ...infer Rest]
	? (arg: H) => Rest extends readonly [] ? R : Curry<Rest, R>
	: R;

type CurriedFunction<T> = T extends (...args: infer A) => infer R ? Curry<A, R> : never;

/**
 * Transforms a function with multiple parameters into a curried function that can be called
 * with one argument at a time, maintaining full type safety throughout the currying chain.
 *
 * The curryfy function supports both strict single-parameter currying (enforced by TypeScript)
 * and partial application with multiple arguments (available at runtime).
 *
 * @template T - The type of the function to be curried
 * @param fn - The function to curry. Must be a function with a fixed number of parameters.
 * @returns A curried version of the input function that can be called one parameter at a time
 *
 * @example
 * ```typescript
 * // Basic usage with single-parameter currying
 * const add = (a: number, b: number, c: number) => a + b + c;
 * const curriedAdd = curryfy(add);
 *
 * const result = curriedAdd(1)(2)(3); // 6
 * ```
 *
 * @example
 * ```typescript
 * // Partial application and reusability
 * const calculator = (op: string, a: number, b: number) => {
 *   switch (op) {
 *     case 'add': return a + b;
 *     case 'multiply': return a * b;
 *     default: return 0;
 *   }
 * };
 *
 * const curriedCalc = curryfy(calculator);
 * const adder = curriedCalc('add');
 * const multiplier = curriedCalc('multiply');
 *
 * console.log(adder(5)(3)); // 8
 * console.log(multiplier(4)(3)); // 12
 * ```
 *
 * @example
 * ```typescript
 * // Type safety with mixed parameter types
 * const formatter = (prefix: string, value: number, suffix: string) =>
 *   `${prefix}${value}${suffix}`;
 *
 * const curriedFormatter = curryfy(formatter);
 * const result = curriedFormatter('[')(42)(']'); // "[42]"
 * ```
 *
 * @example
 * ```typescript
 * // Partial application with multiple arguments (runtime behavior)
 * const add4 = (a: number, b: number, c: number, d: number) => a + b + c + d;
 * const curriedAdd4 = curryfy(add4) as any; // Type assertion for runtime behavior
 *
 * // These all produce the same result:
 * curriedAdd4(1)(2)(3)(4)     // 10
 * curriedAdd4(1, 2)(3, 4)     // 10
 * curriedAdd4(1, 2, 3)(4)     // 10
 * curriedAdd4(1, 2, 3, 4)     // 10
 * ```
 *
 * @remarks
 * - The function uses `fn.length` to determine when all parameters have been provided
 * - Functions with default parameters will curry only the required parameters
 * - Rest parameters are not supported for currying (only fixed-arity functions)
 * - The TypeScript types enforce single-parameter currying for type safety
 * - Runtime behavior supports partial application with multiple arguments
 *
 * @since 1.0.0
 */
export function curryfy<T extends (...args: any[]) => any>(fn: T): CurriedFunction<T> {
	return function curried(...args: any[]): any {
		if (args.length >= fn.length) {
			return fn(...args);
		}
		return (...nextArgs: any[]) => curried(...args, ...nextArgs);
	} as CurriedFunction<T>;
}
