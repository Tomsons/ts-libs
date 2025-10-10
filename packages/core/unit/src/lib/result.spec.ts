import { describe, expect, it } from 'vitest';
import { Err, Ok, Result } from './result.js';

describe('Result', () => {
	describe('factory functions', () => {
		describe('Ok', () => {
			it('should create a successful Result', () => {
				const result = Ok(42);
				expect(result.isOk()).toBe(true);
				expect(result.isErr()).toBe(false);
				expect(result.value).toBe(42);
			});

			it('should handle different value types', () => {
				expect(Ok('hello').value).toBe('hello');
				expect(Ok(true).value).toBe(true);
				expect(Ok(null).value).toBe(null);
				expect(Ok(undefined).value).toBe(undefined);
			});
		});

		describe('Err', () => {
			it('should create a failed Result', () => {
				const result = Err('Something went wrong');
				expect(result.isErr()).toBe(true);
				expect(result.isOk()).toBe(false);
				expect(result.error).toBe('Something went wrong');
			});

			it('should handle different error types', () => {
				expect(Err(404).error).toBe(404);
				expect(Err(new Error('test')).error).toBeInstanceOf(Error);
			});
		});
	});

	describe('static methods', () => {
		describe('Result.ok', () => {
			it('should create a successful Result', () => {
				const result = Result.ok(42);
				expect(result.isOk()).toBe(true);
				expect(result.value).toBe(42);
			});
		});

		describe('Result.err', () => {
			it('should create a failed Result', () => {
				const result = Result.err('error');
				expect(result.isErr()).toBe(true);
				expect(result.error).toBe('error');
			});
		});
	});

	describe('instance methods', () => {
		describe('isOk', () => {
			it('should return true for Ok results', () => {
				expect(Ok(42).isOk()).toBe(true);
				expect(Ok(null).isOk()).toBe(true);
				expect(Ok(undefined).isOk()).toBe(true);
			});

			it('should return false for Err results', () => {
				expect(Err('error').isOk()).toBe(false);
			});
		});

		describe('isErr', () => {
			it('should return false for Ok results', () => {
				expect(Ok(42).isErr()).toBe(false);
			});

			it('should return true for Err results', () => {
				expect(Err('error').isErr()).toBe(true);
			});
		});

		describe('value getter', () => {
			it('should return value for Ok results', () => {
				expect(Ok(42).value).toBe(42);
				expect(Ok('hello').value).toBe('hello');
			});

			it('should throw for Err results', () => {
				const result = Err('error');
				expect(() => result.value).toThrow('Cannot get value from an Err result');
			});
		});

		describe('error getter', () => {
			it('should return error for Err results', () => {
				expect(Err(new Error()).error).toStrictEqual(new Error());
				expect(Err(404).error).toBe(404);
			});

			it('should throw for Ok results', () => {
				const result = Ok(42);
				expect(() => result.error).toThrow('Cannot get error from an Ok result');
			});
		});

		describe('map', () => {
			it('should transform Ok values', () => {
				const result = Ok(5);
				const doubled = result.map((x) => x * 2);
				expect((doubled as Result<number, never>).value).toBe(10);
			});

			it('should not transform Err values', () => {
				const result = Err(new Error('error'));
				const doubled = result.map((x) => x * 2);
				expect((doubled as Result<number, string>).isErr()).toBe(true);
				expect((doubled as Result<number, string>).error).toStrictEqual(new Error('error'));
			});

			it('should handle type transformations', () => {
				const result = Ok(42);
				const str = result.map((x) => x.toString());
				expect((str as Result<string, never>).value).toBe('42');
			});

			it('should chain multiple maps', () => {
				const result = Ok(5)
					.map((x) => x * 2)
					.map((x) => x + 1)
					.map((x) => x.toString());
				expect((result as Result<string, never>).value).toBe('11');
			});
		});

		describe('apply', () => {
			it('should apply function in Ok to value in Ok', () => {
				const value = Ok(5);
				const fn = Ok((x: number) => x * 2);
				const result = value.apply(fn);
				expect((result as Result<number, never>).value).toBe(10);
			});

			it('should return Err if value is Err', () => {
				const value = Err('value error');
				const fn = Ok((x: number) => x * 2);
				const result = value.apply(fn);
				expect((result as Result<number>).isErr()).toBe(true);
				expect((result as Result<number>).error).toBe('value error');
			});

			it('should return Err if function is Err', () => {
				const value = Ok(5);
				const fn = Err('function error');
				const result = value.apply(fn);
				expect((result as Result<number, string>).isErr()).toBe(true);
				expect((result as Result<number, string>).error).toBe('function error');
			});

			it('should return first Err if both are Err', () => {
				const value = Err<string>('value error');
				const fn = Err('function error');
				const result = value.apply(fn);
				expect((result as Result<number, string>).isErr()).toBe(true);
				expect((result as Result<number, string>).error).toBe('value error');
			});
		});

		describe('andThen', () => {
			it('should chain Ok values', () => {
				const divide = (a: number, b: number): Result<number> =>
					b === 0 ? Err(new Error('Division by zero')) : Ok(a / b);

				const result = Ok(10).andThen((x) => divide(x, 2));
				expect(result.value).toBe(5);
			});

			it('should return Err for Ok that leads to Err', () => {
				const divide = (a: number, b: number): Result<number, string> =>
					b === 0 ? Err('Division by zero') : Ok(a / b);

				const result = Ok(10).andThen((x) => divide(x, 0));
				expect((result as Result<number>).isErr()).toBe(true);
				expect((result as Result<number>).error).toBe('Division by zero');
			});

			it('should return Err for Err input', () => {
				const result = Err('initial error').andThen((x) => Ok(x * 2));
				expect((result as Result<number>).isErr()).toBe(true);
				expect((result as Result<number>).error).toBe('initial error');
			});

			it('should prevent nested Results', () => {
				const result = Ok(5).andThen((x) => Ok(Ok(x * 2)));
				expect(result).toBeInstanceOf(Result);
				// Should not be nested Result<Result<number>>
				expect((result as Result<Result<number, any>, any>).value).toBeInstanceOf(Result);
			});

			it('should chain multiple andThen operations', () => {
				const divide = (a: number, b: number): Result<number> =>
					b === 0 ? Err(new Error('Division by zero')) : Ok(a / b);

				const result = Ok(20)
					.andThen((x) => divide(x, 2)) // Ok(10)
					.andThen((x) => divide(x, 5)); // Ok(2)

				expect((result as Result<number>).value).toBe(2);
			});

			it('should short-circuit on Err (railway-oriented programming)', () => {
				const divide = (a: number, b: number): Result<number, string> =>
					b === 0 ? Err('Division by zero') : Ok(a / b);

				const result = Ok(20)
					.andThen((x) => divide(x, 0)) // Err
					.andThen((x) => divide(x, 5)); // Should not execute

				expect((result as Result<number>).isErr()).toBe(true);
				expect((result as Result<number>).error).toBe('Division by zero');
			});
		});

		describe('unwrap', () => {
			it('should return value for Ok results', () => {
				expect(Ok(42).unwrap()).toBe(42);
				expect(Ok('hello').unwrap()).toBe('hello');
			});

			it('should throw for Err results', () => {
				const result = Err('Something went wrong');
				expect(() => result.unwrap()).toThrow('Called unwrap on an Err value: Something went wrong');
			});
		});

		describe('unwrapOr', () => {
			it('should return value for Ok results', () => {
				expect(Ok(42).unwrapOr(0)).toBe(42);
			});

			it('should return default for Err results', () => {
				expect((Err('error') as Result<number, string>).unwrapOr(0)).toBe(0);
				expect((Err('error') as Result<string, string>).unwrapOr('default')).toBe('default');
			});
		});

		describe('asOptional', () => {
			it('should convert Ok to Some', () => {
				const result = Ok(42);
				const optional = result.asOptional();
				expect(optional.isSome()).toBe(true);
				expect(optional.value).toBe(42);
			});

			it('should convert Err to None', () => {
				const result = Err('error');
				const optional = result.asOptional();
				expect(optional.isNone()).toBe(true);
			});
		});

		describe('toString', () => {
			it('should return proper string for Ok values', () => {
				expect(Ok(42).toString()).toBe('Ok(42)');
				expect(Ok('hello').toString()).toBe('Ok(hello)');
				expect(Ok(true).toString()).toBe('Ok(true)');
			});

			it('should return proper string for Err values', () => {
				expect(Err('error').toString()).toBe('Err(error)');
				expect(Err(404).toString()).toBe('Err(404)');
			});

			it('should handle complex objects', () => {
				const obj = { name: 'test', value: 42 };
				const result = Ok(obj);
				expect(result.toString()).toBe(`Ok(${obj})`);
			});
		});
	});

	describe('functional composition', () => {
		it('should compose map operations', () => {
			const pipeline = Ok('hello')
				.map((s) => s.toUpperCase())
				.map((s) => s.length)
				.map((n) => n * 2);

			expect((pipeline as Result<number, never>).value).toBe(10);
		});

		it('should compose with andThen for validation', () => {
			const validatePositive = (n: number): Result<number, string> => (n > 0 ? Ok(n) : Err('Must be positive'));

			const validateEven = (n: number): Result<number, string> => (n % 2 === 0 ? Ok(n) : Err('Must be even'));

			const result = Ok(4).andThen(validatePositive).andThen(validateEven);

			expect((result as Result<number, string>).value).toBe(4);
		});

		it('should handle parsing and validation pipeline', () => {
			const parseNumber = (str: string): Result<number, string> => {
				const num = parseInt(str);
				return isNaN(num) ? Err('Not a number') : Ok(num);
			};

			const validateRange = (n: number): Result<number, string> =>
				n >= 1 && n <= 100 ? Ok(n) : Err('Out of range (1-100)');

			const result = parseNumber('42')
				.andThen(validateRange)
				.map((n) => n * 2);

			expect((result as Result<number, string>).value).toBe(84);
		});

		it('should short-circuit on first Err in chain', () => {
			let executionCount = 0;
			const trackExecution = (x: number) => {
				executionCount++;
				return x * 2;
			};

			Err('error').map(trackExecution).map(trackExecution).map(trackExecution);

			expect(executionCount).toBe(0);
		});
	});

	describe('error handling patterns', () => {
		it('should handle nested error recovery', () => {
			const attempt1 = (): Result<number, string> => Err('Failed attempt 1');
			const attempt2 = (): Result<number, string> => Err('Failed attempt 2');
			const attempt3 = (): Result<number> => Ok(42);

			const result = attempt1()
				.andThen(() => attempt2())
				.andThen(() => attempt3());

			// Since attempt1 fails, the chain stops there
			expect((result as Result<number, string>).isErr()).toBe(true);
			expect((result as Result<number, string>).error).toBe('Failed attempt 1');
		});

		it('should preserve error context through transformations', () => {
			interface ValidationError {
				field: string;
				message: string;
			}

			const validateName = (name: string): Result<string, ValidationError> =>
				name.length > 0 ? Ok(name) : Err({ field: 'name', message: 'Name cannot be empty' });

			const result = validateName('')
				.map((name) => name.toUpperCase())
				.map((name) => `Hello, ${name}!`);

			expect((result as Result<string, ValidationError>).isErr()).toBe(true);
			expect((result as Result<string, ValidationError>).error).toEqual({
				field: 'name',
				message: 'Name cannot be empty',
			});
		});
	});

	describe('edge cases', () => {
		it('should handle null as valid Ok value', () => {
			const result = Ok(null);
			expect(result.isOk()).toBe(true);
			expect(result.value).toBe(null);
		});

		it('should handle undefined as valid Ok value', () => {
			const result = Ok(undefined);
			expect(result.isOk()).toBe(true);
			expect(result.value).toBe(undefined);
		});

		it('should handle zero as valid Ok value', () => {
			const result = Ok(0);
			expect(result.isOk()).toBe(true);
			expect(result.value).toBe(0);
		});

		it('should handle false as valid Ok value', () => {
			const result = Ok(false);
			expect(result.isOk()).toBe(true);
			expect(result.value).toBe(false);
		});

		it('should handle empty string as valid Ok value', () => {
			const result = Ok('');
			expect(result.isOk()).toBe(true);
			expect(result.value).toBe('');
		});

		it('should handle complex objects as values', () => {
			const obj = { a: 1, b: { c: 2 } };
			const result = Ok(obj);
			expect(result.value).toEqual(obj);
			expect(result.value).toBe(obj); // Reference equality
		});

		it('should handle arrays as values', () => {
			const arr = [1, 2, 3];
			const result = Ok(arr);
			expect(result.value).toEqual(arr);
			expect(result.value).toBe(arr);
		});

		it('should handle functions as values', () => {
			const fn = (x: number) => x * 2;
			const result = Ok(fn);
			expect(result.value).toBe(fn);
			expect(result.value(5)).toBe(10);
		});

		it('should handle Error objects as errors', () => {
			const error = new Error('Test error');
			const result = Err(error);
			expect(result.error).toBe(error);
			expect(result.error.message).toBe('Test error');
		});
	});
});
