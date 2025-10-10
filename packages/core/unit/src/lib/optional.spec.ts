import { describe, expect, it } from 'vitest';
import { Maybe, None, Optional, Some } from './optional.js';

describe('Optional', () => {
	describe('factory functions', () => {
		describe('Some', () => {
			it('should create an Optional with a value', () => {
				const opt = Some(42);
				expect(opt.isSome()).toBe(true);
				expect(opt.isNone()).toBe(false);
				expect(opt.value).toBe(42);
			});

			it('should throw error for null value', () => {
				expect(() => Some(null)).toThrow('Cannot create an Optional with a null or undefined value');
			});

			it('should throw error for undefined value', () => {
				expect(() => Some(undefined)).toThrow('Cannot create an Optional with a null or undefined value');
			});
		});

		describe('None', () => {
			it('should create an empty Optional', () => {
				const opt = None();
				expect(opt.isNone()).toBe(true);
				expect(opt.isSome()).toBe(false);
			});
		});

		describe('Maybe', () => {
			it('should create Some for valid values', () => {
				const opt = Maybe(42);
				expect(opt.isSome()).toBe(true);
				expect(opt.value).toBe(42);
			});

			it('should create None for null', () => {
				const opt = Maybe(null);
				expect(opt.isNone()).toBe(true);
			});

			it('should create None for undefined', () => {
				const opt = Maybe(undefined);
				expect(opt.isNone()).toBe(true);
			});

			it('should handle zero value correctly', () => {
				const opt = Maybe(0);
				expect(opt.isSome()).toBe(true);
				expect(opt.value).toBe(0);
			});

			it('should handle empty string correctly', () => {
				const opt = Maybe('');
				expect(opt.isSome()).toBe(true);
				expect(opt.value).toBe('');
			});

			it('should handle false value correctly', () => {
				const opt = Maybe(false);
				expect(opt.isSome()).toBe(true);
				expect(opt.value).toBe(false);
			});
		});
	});

	describe('static methods', () => {
		describe('Optional.some', () => {
			it('should create an Optional with a value', () => {
				const opt = Optional.some('hello');
				expect(opt.isSome()).toBe(true);
				expect(opt.value).toBe('hello');
			});

			it('should throw for null', () => {
				expect(() => Optional.some(null)).toThrow();
			});

			it('should throw for undefined', () => {
				expect(() => Optional.some(undefined)).toThrow();
			});
		});

		describe('Optional.none', () => {
			it('should create an empty Optional', () => {
				const opt = Optional.none<string>();
				expect(opt.isNone()).toBe(true);
				expect(opt.isSome()).toBe(false);
			});
		});

		describe('Optional.fromNullable', () => {
			it('should create Some for non-null values', () => {
				const opt = Optional.fromNullable('test');
				expect(opt.isSome()).toBe(true);
				expect(opt.value).toBe('test');
			});

			it('should create None for null', () => {
				const opt = Optional.fromNullable(null);
				expect(opt.isNone()).toBe(true);
			});

			it('should create None for undefined', () => {
				const opt = Optional.fromNullable(undefined);
				expect(opt.isNone()).toBe(true);
			});
		});
	});

	describe('instance methods', () => {
		describe('isSome', () => {
			it('should return true for Some values', () => {
				expect(Some(42).isSome()).toBe(true);
				expect(Some('').isSome()).toBe(true);
				expect(Some(false).isSome()).toBe(true);
				expect(Some(0).isSome()).toBe(true);
			});

			it('should return false for None values', () => {
				expect(None().isSome()).toBe(false);
			});
		});

		describe('isNone', () => {
			it('should return false for Some values', () => {
				expect(Some(42).isNone()).toBe(false);
				expect(Some('').isNone()).toBe(false);
				expect(Some(false).isNone()).toBe(false);
				expect(Some(0).isNone()).toBe(false);
			});

			it('should return true for None values', () => {
				expect(None().isNone()).toBe(true);
			});
		});

		describe('map', () => {
			it('should transform Some values', () => {
				const opt = Some(5);
				const doubled = opt.map((x) => x * 2);
				expect((doubled as Optional<number>).value).toBe(10);
			});

			it('should not transform None values', () => {
				const opt = None() as Optional<number>;
				const doubled = opt.map((x) => x * 2);
				expect((doubled as Optional<number>).isNone()).toBe(true);
			});

			it('should handle type transformations', () => {
				const opt = Some(42);
				const str = opt.map((x) => x.toString());
				expect((str as Optional<string>).value).toBe('42');
			});

			it('should chain multiple maps', () => {
				const result = Some(5)
					.map((x) => x * 2)
					.map((x) => x + 1)
					.map((x) => x.toString());
				expect((result as Optional<string>).value).toBe('11');
			});

			it('should handle functions that return null/undefined', () => {
				const opt = Some(5);
				const result = opt.map(() => null);
				expect((result as Optional<null>).isNone()).toBe(true);
			});
		});

		describe('apply', () => {
			it('should apply function in Some to value in Some', () => {
				const value = Some(5);
				const fn = Some((x: number) => x * 2);
				const result = value.apply(fn);
				expect((result as Optional<number>).value).toBe(10);
			});

			it('should return None if value is None', () => {
				const value = None() as Optional<number>;
				const fn = Some((x: number) => x * 2);
				const result = value.apply(fn);
				expect((result as Optional<number>).isNone()).toBe(true);
			});

			it('should return None if function is None', () => {
				const value = Some(5);
				const fn = None() as Optional<(x: number) => number>;
				const result = value.apply(fn);
				expect((result as Optional<number>).isNone()).toBe(true);
			});

			it('should return None if both are None', () => {
				const value = None() as Optional<number>;
				const fn = None() as Optional<(x: number) => number>;
				const result = value.apply(fn);
				expect((result as Optional<number>).isNone()).toBe(true);
			});
		});

		describe('andThen', () => {
			it('should chain Some values', () => {
				const opt = Some(5);
				const result = opt.andThen((x) => (x > 0 ? Some(x * 2) : None()));
				expect((result as Optional<number>).value).toBe(10);
			});

			it('should return None for Some that fails condition', () => {
				const opt = Some(-5);
				const result = opt.andThen((x) => (x > 0 ? Some(x * 2) : None()));
				expect((result as Optional<number>).isNone()).toBe(true);
			});

			it('should return None for None input', () => {
				const opt = None() as Optional<number>;
				const result = opt.andThen((x) => Some(x * 2));
				expect((result as Optional<number>).isNone()).toBe(true);
			});

			it('should prevent nested Optionals', () => {
				const opt = Some(5);
				const result = opt.andThen((x) => Some(Some(x * 2)));
				expect(result).toBeInstanceOf(Optional);
				// Should not be nested Optional<Optional<number>>
				expect((result as Optional<Optional<number>>).value).toBeInstanceOf(Optional);
			});

			it('should chain multiple andThen operations', () => {
				const divide = (a: number, b: number) => (b === 0 ? (None() as Optional<number>) : Some(a / b));

				const result = Some(20)
					.andThen((x) => divide(x, 2)) // Some(10)
					.andThen((x) => divide(x, 5)); // Some(2)

				expect((result as Optional<number>).value).toBe(2);
			});

			it('should short-circuit on None', () => {
				const divide = (a: number, b: number) => (b === 0 ? (None() as Optional<number>) : Some(a / b));

				const result = Some(20)
					.andThen((x) => divide(x, 0)) // None
					.andThen((x) => divide(x, 5)); // Should not execute

				expect((result as Optional<number>).isNone()).toBe(true);
			});
		});

		describe('toString', () => {
			it('should return proper string for Some values', () => {
				expect(Some(42).toString()).toBe('Optional.some(42)');
				expect(Some('hello').toString()).toBe('Optional.some(hello)');
				expect(Some(true).toString()).toBe('Optional.some(true)');
			});

			it('should return proper string for None values', () => {
				expect(None().toString()).toBe('Optional.none');
			});

			it('should handle complex objects', () => {
				const obj = { name: 'test', value: 42 };
				const opt = Some(obj);
				expect(opt.toString()).toBe(`Optional.some(${obj})`);
			});
		});
	});

	describe('functional composition', () => {
		it('should compose map operations', () => {
			const pipeline = Some('hello')
				.map((s) => s.toUpperCase())
				.map((s) => s.length)
				.map((n) => n * 2);

			expect((pipeline as Optional<number>).value).toBe(10);
		});

		it('should compose with andThen for validation', () => {
			const validatePositive = (n: number) => (n > 0 ? Some(n) : None<number>());

			const validateEven = (n: number) => (n % 2 === 0 ? Some(n) : None<number>());

			const result = Some(4).andThen(validatePositive).andThen(validateEven);

			expect((result as Optional<number>).value).toBe(4);
		});

		it('should handle complex chaining with different types', () => {
			interface User {
				name: string;
				email?: string;
			}

			const user: User = { name: 'John', email: 'john@example.com' };

			const result = Some(user)
				.map((u) => u.email)
				.andThen((email) => (email ? Some(email) : None<string>()))
				.map((email) => email.toLowerCase())
				.map((email) => `Email: ${email}`);

			expect((result as Optional<string>).value).toBe('Email: john@example.com');
		});

		it('should short-circuit on first None in chain', () => {
			let executionCount = 0;
			const trackExecution = (x: number) => {
				executionCount++;
				return x * 2;
			};

			None<number>().map(trackExecution).map(trackExecution).map(trackExecution);

			expect(executionCount).toBe(0);
		});
	});

	describe('edge cases', () => {
		it('should handle empty string as valid value', () => {
			const opt = Some('');
			expect(opt.isSome()).toBe(true);
			expect(opt.value).toBe('');
		});

		it('should handle zero as valid value', () => {
			const opt = Some(0);
			expect(opt.isSome()).toBe(true);
			expect(opt.value).toBe(0);
		});

		it('should handle false as valid value', () => {
			const opt = Some(false);
			expect(opt.isSome()).toBe(true);
			expect(opt.value).toBe(false);
		});

		it('should handle NaN as valid value', () => {
			const opt = Some(NaN);
			expect(opt.isSome()).toBe(true);
			expect(Number.isNaN(opt.value)).toBe(true);
		});

		it('should handle complex objects', () => {
			const obj = { a: 1, b: { c: 2 } };
			const opt = Some(obj);
			expect(opt.value).toEqual(obj);
			expect(opt.value).toBe(obj); // Reference equality
		});

		it('should handle arrays', () => {
			const arr = [1, 2, 3];
			const opt = Some(arr);
			expect(opt.value).toEqual(arr);
			expect(opt.value).toBe(arr);
		});

		it('should handle functions', () => {
			const fn = (x: number) => x * 2;
			const opt = Some(fn);
			expect(opt.value).toBe(fn);
			expect(opt.value(5)).toBe(10);
		});
	});
});
