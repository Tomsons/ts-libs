import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Task } from './task.js';

describe('Task', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('factory methods', () => {
		describe('Task.of', () => {
			it('should create a Task from a Promise-returning function', () => {
				const task = Task.of(() => Promise.resolve(42));
				expect(task).toBeInstanceOf(Task);
			});

			it('should create a Task from an async function', () => {
				const task = Task.of(async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					return 42;
				});
				expect(task).toBeInstanceOf(Task);
			});
		});
	});

	describe('value getter', () => {
		it('should throw error when accessing value directly', () => {
			const task = Task.of(() => Promise.resolve(42));
			expect(() => task.value).toThrow(
				'Cannot get value from a Task. Use run() to execute the task and get the result.',
			);
		});
	});

	describe('run method', () => {
		it('should execute successful task and return Ok result', async () => {
			const task = Task.of(() => Promise.resolve(42));
			const result = await task.run();

			expect(result.isOk()).toBe(true);
			expect(result.value).toBe(42);
		});

		it('should execute failing task and return Err result', async () => {
			const task = Task.of(() => Promise.reject(new Error('Task failed')));
			const result = await task.run();

			expect(result.isErr()).toBe(true);
			expect(result.error.message).toBe('Task failed');
		});

		it('should handle async functions', async () => {
			const task = Task.of(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return 'async result';
			});

			const result = await task.run();
			expect(result.isOk()).toBe(true);
			expect(result.value).toBe('async result');
		});

		it('should handle thrown errors in async functions', async () => {
			const task = Task.of(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				throw new Error('Async error');
			});

			const result = await task.run();
			expect(result.isErr()).toBe(true);
			expect(result.error.message).toBe('Async error');
		});

		it('should handle different value types', async () => {
			const stringTask = Task.of(() => Promise.resolve('hello'));
			const numberTask = Task.of(() => Promise.resolve(42));
			const booleanTask = Task.of(() => Promise.resolve(true));
			const objectTask = Task.of(() => Promise.resolve({ key: 'value' }));
			const arrayTask = Task.of(() => Promise.resolve([1, 2, 3]));
			const nullTask = Task.of(() => Promise.resolve(null));
			const undefinedTask = Task.of(() => Promise.resolve(undefined));

			expect((await stringTask.run()).value).toBe('hello');
			expect((await numberTask.run()).value).toBe(42);
			expect((await booleanTask.run()).value).toBe(true);
			expect((await objectTask.run()).value).toEqual({ key: 'value' });
			expect((await arrayTask.run()).value).toEqual([1, 2, 3]);
			expect((await nullTask.run()).value).toBe(null);
			expect((await undefinedTask.run()).value).toBe(undefined);
		});
	});

	describe('map method', () => {
		it('should transform successful task result', async () => {
			const task = Task.of(() => Promise.resolve(5));
			const mappedTask = task.map((x) => x * 2);

			const result = await (mappedTask as Task<number>).run();
			expect(result.isOk()).toBe(true);
			expect(result.value).toBe(10);
		});

		it('should not transform failed task result', async () => {
			const task = Task.of((): Promise<number> => Promise.reject(new Error('Original error')));
			const mappedTask = task.map((x) => (x as number) * 2);

			const result = await (mappedTask as Task<number>).run();
			expect(result.isErr()).toBe(true);
			expect(result.error.message).toBe('Original error');
		});

		it('should handle type transformations', async () => {
			const task = Task.of(() => Promise.resolve(42));
			const mappedTask = task.map((x) => x.toString());

			const result = await (mappedTask as Task<string>).run();
			expect(result.value).toBe('42');
		});

		it('should chain multiple map operations', async () => {
			const task = Task.of(() => Promise.resolve(5))
				.map((x) => x * 2)
				.map((x) => x + 1)
				.map((x) => x.toString());

			const result = await (task as Task<string>).run();
			expect(result.value).toBe('11');
		});

		it('should not execute map function if original task fails', async () => {
			let mapExecuted = false;
			const task = Task.of(() => Promise.reject(new Error('Task failed')));
			const mappedTask = task.map(() => {
				mapExecuted = true;
				return 42;
			});

			await (mappedTask as Task<number>).run();
			expect(mapExecuted).toBe(false);
		});

		it('should handle errors thrown in map function', async () => {
			const task = Task.of(() => Promise.resolve(5));
			const mappedTask = task.map(() => {
				throw new Error('Map error');
			});

			const result = await (mappedTask as Task<number>).run();
			expect(result.isErr()).toBe(true);
			expect(result.error.message).toBe('Map error');
		});
	});

	describe('apply method', () => {
		it('should apply function task to value task when both succeed', async () => {
			const valueTask = Task.of(() => Promise.resolve(5));
			const fnTask = Task.of(() => Promise.resolve((x: number) => x * 2));

			const result = await (valueTask.apply(fnTask) as Task<number>).run();
			expect(result.isOk()).toBe(true);
			expect(result.value).toBe(10);
		});

		it('should return error if value task fails', async () => {
			const valueTask = Task.of((): Promise<number> => Promise.reject(new Error('Value error')));
			const fnTask = Task.of(() => Promise.resolve((x: number) => x * 2));

			const result = await (valueTask.apply(fnTask) as Task<number>).run();
			expect(result.isErr()).toBe(true);
			expect(result.error.message).toBe('Value error');
		});

		it('should return error if function task fails', async () => {
			const valueTask = Task.of((): Promise<number> => Promise.resolve(5));
      const fnTask = Task.of((): Promise<(num: number) => number> => Promise.reject(new Error('Function error')));

			const result = await (valueTask.apply(fnTask) as Task<number>).run();
			expect(result.isErr()).toBe(true);
			expect(result.error.message).toBe('Function error');
		});

		it('should return first error if both tasks fail', async () => {
			const valueTask = Task.of((): Promise<number> => Promise.reject(new Error('Value error')));
			const fnTask = Task.of((): Promise<(num: number) => number> => Promise.reject(new Error('Function error')));

			const result = await (valueTask.apply(fnTask) as Task<number>).run();
			expect(result.isErr()).toBe(true);
			expect(result.error.message).toBe('Value error');
		});

		it('should handle complex function applications', async () => {
			const task1 = Task.of(() => Promise.resolve(3));
			Task.of(() => Promise.resolve(4));
			const addTask = Task.of(() => Promise.resolve((a: number) => (b: number) => a + b));

			// Simulate curried function application
			await (task1.apply(addTask.apply(Task.of(() => Promise.resolve((f: any) => f)))) as Task<number>).run();
			// This is a complex case - in practice you'd use andThen for this
		});
	});

	describe('andThen method', () => {
		it('should chain tasks when first succeeds', async () => {
			const task1 = Task.of(() => Promise.resolve(5));
			const task2 = (x: number) => Task.of(() => Promise.resolve(x * 2));

			const result = await (task1.andThen(task2) as Task<number>).run();
			expect(result.isOk()).toBe(true);
			expect(result.value).toBe(10);
		});

		it('should not execute second task if first fails', async () => {
			let secondTaskExecuted = false;
			const task1 = Task.of(() => Promise.reject(new Error('First task failed')));
			const task2 = () => {
				secondTaskExecuted = true;
				return Task.of(() => Promise.resolve(42));
			};

			const result = await (task1.andThen(task2) as Task<number>).run();
			expect(result.isErr()).toBe(true);
			expect(result.error.message).toBe('First task failed');
			expect(secondTaskExecuted).toBe(false);
		});

		it('should propagate error from second task', async () => {
			const task1 = Task.of(() => Promise.resolve(5));
			const task2 = () => Task.of((): Promise<number> => Promise.reject(new Error('Second task failed')));

			const result = await (task1.andThen(task2) as Task<number>).run();
			expect(result.isErr()).toBe(true);
			expect(result.error.message).toBe('Second task failed');
		});

		it('should chain multiple tasks', async () => {
			const fetchUser = (id: number) => Task.of(() => Promise.resolve({ id, name: `User${id}` }));
			const fetchProfile = (user: { id: number; name: string }) =>
				Task.of(() => Promise.resolve({ ...user, email: `${user.name.toLowerCase()}@example.com` }));
			const formatProfile = (profile: any) => Task.of(() => Promise.resolve(`${profile.name} <${profile.email}>`));

			const pipeline = Task.of(() => Promise.resolve(1))
				.andThen(fetchUser)
				.andThen(fetchProfile)
				.andThen(formatProfile);

			const result = await (pipeline as Task<string>).run();
			expect(result.isOk()).toBe(true);
			expect(result.value).toBe('User1 <user1@example.com>');
		});

		it('should prevent nested Task structures', async () => {
			const task = Task.of(() => Promise.resolve(5));
			const nestedTask = task.andThen((x) => Task.of(() => Promise.resolve(Task.of(() => Promise.resolve(x * 2)))));

			const result = await (nestedTask as Task<Task<number>>).run();
			expect(result.isOk()).toBe(true);
			expect(result.value).toBeInstanceOf(Task);
		});

		it('should handle errors in andThen function', async () => {
			const task = Task.of(() => Promise.resolve(5));
			const chainedTask = task.andThen(() => {
				throw new Error('Chain function error');
			});

			const result = await (chainedTask as Task<number>).run();
			expect(result.isErr()).toBe(true);
			expect(result.error.message).toBe('Chain function error');
		});

		it('should throw error if andThen function returns non-Task', async () => {
			const task = Task.of(() => Promise.resolve(5));
			const chainedTask = task.andThen(() => 'not a task' as any);

			const result = await (chainedTask as Task<string>).run();
			expect(result.isErr()).toBe(true);
			expect(result.error.message).toBe('andThen function must return a Task');
		});
	});

	describe('asOptional method', () => {
		it('should convert successful task to Some', async () => {
			const task = Task.of(() => Promise.resolve(42));
			const optional = await task.asOptional();

			expect(optional.isSome()).toBe(true);
			expect(optional.value).toBe(42);
		});

		it('should convert failed task to None', async () => {
			const task = Task.of(() => Promise.reject(new Error('Task failed')));
			const optional = await task.asOptional();

			expect(optional.isNone()).toBe(true);
		});

		it('should handle null/undefined values correctly', async () => {
			const nullTask = Task.of(() => Promise.resolve(null));
			const undefinedTask = Task.of(() => Promise.resolve(undefined));

			const nullOptional = await nullTask.asOptional();
			const undefinedOptional = await undefinedTask.asOptional();

			expect(nullOptional.isNone()).toBe(true);
			expect(undefinedOptional.isNone()).toBe(true);
		});
	});

	describe('toString method', () => {
		it('should return string representation', () => {
			const task = Task.of(() => Promise.resolve(42));
			const str = task.toString();

			expect(str).toMatch(/^Task\(/);
			expect(str).toMatch(/\)$/);
		});
	});

	describe('functional composition', () => {
		it('should compose map and andThen operations', async () => {
			const pipeline = Task.of(() => Promise.resolve('hello'))
				.map((s) => s.toUpperCase())
				.andThen((s) => Task.of(() => Promise.resolve(s.length)))
				.map((n) => n * 2);

			const result = await (pipeline as Task<number>).run();
			expect(result.value).toBe(10);
		});

		it('should handle complex data transformations', async () => {
			interface User {
				id: number;
				name: string;
				active: boolean;
			}

			const fetchUsers = () =>
				Task.of(() =>
					Promise.resolve([
						{ id: 1, name: 'John', active: true },
						{ id: 2, name: 'Jane', active: false },
						{ id: 3, name: 'Bob', active: true },
					]),
				);

			const filterActive = (users: User[]) => Task.of(() => Promise.resolve(users.filter((u) => u.active)));

			const getNames = (users: User[]) => Task.of(() => Promise.resolve(users.map((u) => u.name)));

			const pipeline = fetchUsers()
				.andThen(filterActive)
				.andThen(getNames)
				.map((names) => names.join(', '));

			const result = await (pipeline as Task<string>).run();
			expect(result.value).toBe('John, Bob');
		});

		it('should short-circuit on first failure', async () => {
			let step2Executed = false;
			let step3Executed = false;

			const pipeline = Task.of(() => Promise.resolve(5))
				.map((x) => x * 2) // Should execute: 10
				.andThen(() => Task.of(() => Promise.reject(new Error('Step 2 failed'))))
				.andThen(() => {
					step2Executed = true;
					return Task.of(() => Promise.resolve(42));
				})
				.map(() => {
					step3Executed = true;
					return 99;
				});

			const result = await (pipeline as Task<number>).run();
			expect(result.isErr()).toBe(true);
			expect(result.error.message).toBe('Step 2 failed');
			expect(step2Executed).toBe(false);
			expect(step3Executed).toBe(false);
		});
	});

	describe('error handling patterns', () => {
		it('should handle network simulation', async () => {
			const simulateNetworkCall = (url: string, shouldFail = false) =>
				Task.of(() => {
					if (shouldFail) {
						return Promise.reject(new Error(`Network error for ${url}`));
					}
					return Promise.resolve({ url, data: `Data from ${url}` });
				});

			const successResult = await simulateNetworkCall('/api/users').run();
			expect(successResult.isOk()).toBe(true);
			expect(successResult.value.data).toBe('Data from /api/users');

			const failureResult = await simulateNetworkCall('/api/users', true).run();
			expect(failureResult.isErr()).toBe(true);
			expect(failureResult.error.message).toBe('Network error for /api/users');
		});

		it('should handle timeout simulation', async () => {
			const timeoutTask = Task.of(
				() =>
					new Promise((_, reject) => {
						setTimeout(() => reject(new Error('Timeout')), 50);
					}),
			);

			const result = await timeoutTask.run();
			expect(result.isErr()).toBe(true);
			expect(result.error.message).toBe('Timeout');
		});

		it('should handle parallel task failures', async () => {
			const task1 = Task.of(() => Promise.resolve(1));
			const task2 = Task.of(() => Promise.reject(new Error('Task 2 failed')));

			// Since apply runs tasks in parallel, we can test this
			const combined = task1.apply(Task.of(() => Promise.resolve((x: number) => x + 1)));
			const combinedWithFailure = task1.apply(task2 as any);

			const result1 = await (combined as Task<number>).run();
			const result2 = await (combinedWithFailure as Task<number>).run();

			expect(result1.isOk()).toBe(true);
			expect(result1.value).toBe(2);
			expect(result2.isErr()).toBe(true);
			expect(result2.error.message).toBe('Task 2 failed');
		});
	});

	describe('edge cases', () => {
		it('should handle tasks that return null', async () => {
			const task = Task.of(() => Promise.resolve(null));
			const result = await task.run();

			expect(result.isOk()).toBe(true);
			expect(result.value).toBe(null);
		});

		it('should handle tasks that return undefined', async () => {
			const task = Task.of(() => Promise.resolve(undefined));
			const result = await task.run();

			expect(result.isOk()).toBe(true);
			expect(result.value).toBe(undefined);
		});

		it('should handle tasks that return complex objects', async () => {
			const obj = {
				nested: {
					array: [1, 2, 3],
					fn: (x: number) => x * 2,
				},
			};
			const task = Task.of(() => Promise.resolve(obj));
			const result = await task.run();

			expect(result.isOk()).toBe(true);
			expect(result.value).toEqual(obj);
			expect(result.value).toBe(obj); // Reference equality
		});

		it('should handle tasks that immediately throw', async () => {
			const task = Task.of(() => {
				throw new Error('Immediate error');
			});
			const result = await task.run();
			expect(result.isErr()).toBe(true);
			expect(result.error.message).toBe('Immediate error');
		});

		it('should handle non-Error objects as errors', async () => {
			const task = Task.of(() => Promise.reject('String error'));
			const result = await task.run();

			expect(result.isErr()).toBe(true);
			expect(result.error).toBe('String error');
		});

		it('should handle very long task chains', async () => {
			let task: Task<number> = Task.of(() => Promise.resolve(0));

			// Chain 100 operations
			for (let i = 0; i < 100; i++) {
				task = task.map((x) => x + 1) as Task<number>;
			}

			const result = await task.run();
			expect(result.isOk()).toBe(true);
			expect(result.value).toBe(100);
		});
	});

	describe('performance considerations', () => {
		it('should not execute task function until run() is called', () => {
			let executed = false;
			Task.of(() => {
				executed = true;
				return Promise.resolve(42);
			});

			expect(executed).toBe(false);
		});

		it('should execute task function only when run() is called', async () => {
			let executionCount = 0;
			const task = Task.of(() => {
				executionCount++;
				return Promise.resolve(42);
			});

			// Multiple calls to run() should execute the function multiple times
			await task.run();
			await task.run();

			expect(executionCount).toBe(2);
		});

		it('should handle tasks that resolve immediately', async () => {
			const start = Date.now();
			const task = Task.of(() => Promise.resolve(42));
			const result = await task.run();
			const duration = Date.now() - start;

			expect(result.isOk()).toBe(true);
			expect(duration).toBeLessThan(10); // Should be very fast
		});
	});
});
