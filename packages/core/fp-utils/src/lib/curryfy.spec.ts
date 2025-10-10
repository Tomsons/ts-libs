import { describe, expect, it } from 'vitest';
import { curryfy } from './curryfy.js';

describe('curryfy', () => {
	describe('basic functionality', () => {
		it('should curry a function with multiple parameters', () => {
			const add = (a: number, b: number, c: number) => a + b + c;
			const curriedAdd = curryfy(add);

			const result = curriedAdd(1)(2)(3);
			expect(result).toBe(6);
		});

		it('should work with the example function (a + b + c + d)', () => {
			const fn = (a: number, b: number, c: number, d: string) => a + b + c + d;
			const curriedFn = curryfy(fn);

			const result = curriedFn(1)(2)(3)('hello');
			expect(result).toBe('6hello');
		});

		it('should work with functions of different arities', () => {
			// Unary function
			const unary = (x: number) => x * 2;
			const curriedUnary = curryfy(unary);
			expect(curriedUnary(5)).toBe(10);

			// Binary function
			const binary = (x: number, y: number) => x * y;
			const curriedBinary = curryfy(binary);
			expect(curriedBinary(3)(4)).toBe(12);

			// Function with many parameters
			const manyParams = (a: number, b: number, c: number, d: number, e: number) => a + b + c + d + e;
			const curriedMany = curryfy(manyParams);
			expect(curriedMany(1)(2)(3)(4)(5)).toBe(15);
		});
	});

	describe('partial application', () => {
		it('should support partial application with multiple arguments at once', () => {
			const add = (a: number, b: number, c: number, d: number) => a + b + c + d;
			const curriedAdd = curryfy(add) as any; // Type assertion to test runtime behavior

			// Various partial application patterns (testing runtime behavior)
			expect(curriedAdd(1, 2)(3, 4)).toBe(10);
			expect(curriedAdd(1)(2, 3)(4)).toBe(10);
			expect(curriedAdd(1, 2, 3)(4)).toBe(10);
			expect(curriedAdd(1, 2, 3, 4)).toBe(10);
		});

		it('should return intermediate curried functions', () => {
			const multiply = (a: number, b: number, c: number) => a * b * c;
			const curriedMultiply = curryfy(multiply);

			const partiallyApplied = curriedMultiply(2)(3);
			expect(typeof partiallyApplied).toBe('function');
			expect(partiallyApplied(4)).toBe(24);
		});

		it('should work with mixed parameter types', () => {
			const mixedFn = (str: string, num: number, bool: boolean) => `${str}-${num}-${bool}`;
			const curriedMixed = curryfy(mixedFn);

			expect(curriedMixed('hello')(42)(true)).toBe('hello-42-true');
			// Test partial application with type assertion
			expect((curriedMixed as any)('test', 10)(false)).toBe('test-10-false');
		});
	});

	describe('edge cases', () => {
		it('should handle functions with no parameters', () => {
			const noParams = () => 'no params';
			const curriedNoParams = curryfy(noParams) as any; // Type assertion needed for 0-arity functions
			expect(curriedNoParams()).toBe('no params');
		});

		it('should handle functions that return functions', () => {
			const higherOrder = (x: number) => (y: number) => x + y;
			const curriedHigherOrder = curryfy(higherOrder);
			const innerFn = curriedHigherOrder(5);
			expect(typeof innerFn).toBe('function');
			expect(innerFn(3)).toBe(8);
		});

		it('should handle functions with undefined/null parameters', () => {
			const withNullable = (a: number, b: string | null, c: undefined | number) => `${a}-${b}-${c}`;
			const curriedNullable = curryfy(withNullable);

			expect(curriedNullable(1)(null)(undefined)).toBe('1-null-undefined');
			expect(curriedNullable(2)('test')(42)).toBe('2-test-42');
		});

		it('should preserve function context and closures', () => {
			let counter = 0;
			const withClosure = (a: number, b: number) => {
				counter++;
				return a + b + counter;
			};

			const curriedWithClosure = curryfy(withClosure);
			expect(curriedWithClosure(1)(2)).toBe(4); // 1 + 2 + 1
			expect(curriedWithClosure(3)(4)).toBe(9); // 3 + 4 + 2
		});
	});

	describe('error handling', () => {
		it('should handle functions that throw errors', () => {
			const throwingFn = (a: number, b: number) => {
				if (a < 0) throw new Error('Negative number');
				return a + b;
			};

			const curriedThrowing = curryfy(throwingFn);
			expect(() => curriedThrowing(-1)(2)).toThrow('Negative number');
			expect(curriedThrowing(1)(2)).toBe(3);
		});

		it('should work with functions that return falsy values', () => {
			const falsyReturns = (a: boolean, b: number) => (a ? b : 0);
			const curriedFalsy = curryfy(falsyReturns);

			expect(curriedFalsy(true)(5)).toBe(5);
			expect(curriedFalsy(false)(5)).toBe(0);
		});
	});

	describe('performance and reusability', () => {
		it('should allow reuse of partially applied functions', () => {
			const calculator = (op: string, a: number, b: number) => {
				switch (op) {
					case 'add':
						return a + b;
					case 'multiply':
						return a * b;
					default:
						return 0;
				}
			};

			const curriedCalc = curryfy(calculator);
			const adder = curriedCalc('add');
			const multiplier = curriedCalc('multiply');

			expect(adder(5)(3)).toBe(8);
			expect(adder(10)(2)).toBe(12);
			expect(multiplier(4)(3)).toBe(12);
			expect(multiplier(6)(2)).toBe(12);
		});

		it('should handle complex nested currying scenarios', () => {
			const complexFn = (a: number, b: string, c: boolean, d: number[], e: object) => ({
				a,
				b,
				c,
				d,
				e,
				sum: a + d.reduce((acc, val) => acc + val, 0),
			});

			const curriedComplex = curryfy(complexFn);
			const result = curriedComplex(10)('test')(true)([1, 2, 3])({ key: 'value' });

			expect(result).toEqual({
				a: 10,
				b: 'test',
				c: true,
				d: [1, 2, 3],
				e: { key: 'value' },
				sum: 16,
			});
		});
	});

	describe('type safety scenarios', () => {
		it('should maintain type information through currying chain', () => {
			const typedFn = (str: string, num: number, arr: string[]) => ({
				str: str.toUpperCase(),
				num: num * 2,
				arr: arr.join('-'),
			});

			const curriedTyped = curryfy(typedFn);
			const result = curriedTyped('hello')(42)(['a', 'b', 'c']);

			expect(result).toEqual({
				str: 'HELLO',
				num: 84,
				arr: 'a-b-c',
			});
		});

		it('should work with generic-like scenarios', () => {
			const formatter = <T>(prefix: string, value: T, suffix: string) => `${prefix}${value}${suffix}`;
			const curriedFormatter = curryfy(formatter);

			expect(curriedFormatter('[')(42)(']')).toBe('[42]');
			expect(curriedFormatter('{')('test')('}')).toBe('{test}');
		});
	});

	describe('edge cases with argument length', () => {
		it('should handle excess arguments correctly', () => {
			const twoParam = (a: number, b: number) => a + b;
			const curriedTwo = curryfy(twoParam) as any; // Type assertion to test runtime behavior

			// Should work with exact number of args
			expect(curriedTwo(1, 2)).toBe(3);

			// Should work with excess args (they should be ignored)
			expect(curriedTwo(1, 2, 3, 4)).toBe(3);
		});

		it('should handle rest parameters if the function has them', () => {
			const withRest = (a: number, b: number, ...rest: number[]) => {
				return a + b + rest.reduce((sum, val) => sum + val, 0);
			};

			const curriedRest = curryfy(withRest);
			// Note: This will only curry the first 2 parameters due to fn.length
			expect(curriedRest(1)(2)).toBe(3);
		});

		it('should handle functions with default parameters', () => {
			const withDefaults = (a: number, b: number = 10, c: number = 20) => a + b + c;
			const curriedDefaults = curryfy(withDefaults);

			// fn.length only counts parameters without defaults
			expect(curriedDefaults(5)).toBe(35); // 5 + 10 + 20
		});

		it('should handle immediate execution when all args provided', () => {
			const add3 = (a: number, b: number, c: number) => a + b + c;
			const curriedAdd3 = curryfy(add3) as any;

			// Should execute immediately when all arguments provided
			expect(curriedAdd3(1, 2, 3)).toBe(6);
		});

		it('should handle currying with single argument at each step', () => {
			const add4 = (a: number, b: number, c: number, d: number) => a + b + c + d;
			const curriedAdd4 = curryfy(add4);

			// Test strict single-argument currying
			const step1 = curriedAdd4(1);
			const step2 = step1(2);
			const step3 = step2(3);
			const result = step3(4);

			expect(typeof step1).toBe('function');
			expect(typeof step2).toBe('function');
			expect(typeof step3).toBe('function');
			expect(result).toBe(10);
		});

		it('should work with functions returning other data types', () => {
			const createArray = (a: number, b: string, c: boolean) => [a, b, c];
			const curriedCreateArray = curryfy(createArray);

			expect(curriedCreateArray(42)('test')(true)).toEqual([42, 'test', true]);
		});

		it('should handle functions with object parameters', () => {
			const processObjects = (obj1: { x: number }, obj2: { y: string }) => ({
				...obj1,
				...obj2,
				combined: true,
			});

			const curriedProcessObjects = curryfy(processObjects);
			const result = curriedProcessObjects({ x: 10 })({ y: 'hello' });

			expect(result).toEqual({
				x: 10,
				y: 'hello',
				combined: true,
			});
		});
	});
});
