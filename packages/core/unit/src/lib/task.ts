import type { Optional } from './optional.js';
import { Result } from './result.js';
import type { Unit } from './unit.js';

/**
 * Represents an asynchronous computation that can be composed and chained using functional patterns.
 *
 * Task wraps a Promise-returning function and provides functional composition capabilities
 * through the Unit interface. It automatically handles errors by converting them to Result types,
 * enabling safe error handling without exceptions.
 *
 * @template T The type of value that this Task will produce when executed
 *
 * @example
 * ```typescript
 * // Creating tasks
 * const fetchUser = Task.of(() => fetch('/api/user').then(r => r.json()));
 * const processData = Task.of(() => Promise.resolve(42));
 *
 * // Chaining tasks
 * const pipeline = fetchUser
 *   .map(user => user.name.toUpperCase())
 *   .andThen(name => Task.of(() => saveToDatabase(name)));
 *
 * // Executing the task
 * const result = await pipeline.run();
 * if (result.isOk()) {
 *   console.log('Success:', result.value);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export class Task<T> implements Unit<T> {
	constructor(private readonly task: () => Promise<T>) {}

	/**
	 * Creates a new Task from a Promise-returning function.
	 *
	 * @template T The type of value the task will produce
	 * @param task A function that returns a Promise
	 * @returns A new Task wrapping the provided function
	 *
	 * @example
	 * ```typescript
	 * const httpTask = Task.of(() => fetch('/api/data').then(r => r.json()));
	 * const computeTask = Task.of(async () => {
	 *   const result = await heavyComputation();
	 *   return result * 2;
	 * });
	 * ```
	 */
	static of<T>(task: () => Promise<T>): Task<T> {
		return new Task(async () => {
			return task();
		});
	}

	/**
	 * Gets the value from this Task.
	 *
	 * @throws Error always, as Tasks must be executed using run() to obtain their values
	 *
	 * @example
	 * ```typescript
	 * const task = Task.of(() => Promise.resolve(42));
	 * // task.value; // Throws error
	 * const result = await task.run(); // Correct way to get the value
	 * ```
	 */
	public get value(): T {
		throw new Error('Cannot get value from a Task. Use run() to execute the task and get the result.');
	}

	/**
	 * Transforms the result of this Task using the provided function.
	 * The transformation only occurs if the Task executes successfully.
	 *
	 * @template U The type of the transformed value
	 * @param fn Function to transform the Task's result
	 * @returns A new Task that will apply the transformation when executed
	 *
	 * @example
	 * ```typescript
	 * const numberTask = Task.of(() => Promise.resolve(21));
	 * const doubledTask = numberTask.map(x => x * 2); // Will produce 42
	 *
	 * const result = await doubledTask.run();
	 * console.log(result.value); // 42 (if successful)
	 * ```
	 */
	public map<U>(fn: (value: T) => U): Task<U> {
		return new Task<U>(() =>
			this.run().then((result) => {
				if (result.isOk()) {
					return fn(result.value);
				} else {
					return Promise.reject(result.error);
				}
			}),
		);
	}

	/**
	 * Applies a function wrapped in a Task to the value produced by this Task.
	 * Both Tasks must succeed for the application to succeed.
	 *
	 * @template U The return type of the applied function
	 * @param fn A Task containing a function to apply to this Task's value
	 * @returns A new Task that applies the function when both Tasks succeed
	 *
	 * @example
	 * ```typescript
	 * const valueTask = Task.of(() => Promise.resolve(5));
	 * const fnTask = Task.of(() => Promise.resolve((x: number) => x * 2));
	 *
	 * const resultTask = valueTask.apply(fnTask); // Will produce 10
	 * const result = await resultTask.run();
	 * ```
	 */
	public apply<U>(fn: Task<(value: T) => U>): Task<U> {
		return new Task<U>(() =>
			Promise.all([this.run(), fn.run()]).then(([result, fnResult]) => {
				if (result.isOk() && fnResult.isOk()) {
					return fnResult.value(result.value);
				} else if (result.isErr()) {
					return Promise.reject(result.error);
				} else {
					return Promise.reject(fnResult.error);
				}
			}),
		);
	}

	/**
	 * Chains Task computations, preventing nested Task structures.
	 * If this Task fails, the chaining function is not called.
	 *
	 * @template U The type of value in the returned Task
	 * @param fn Function that takes this Task's value and returns a new Task
	 * @returns The Task returned by the function, or a failed Task if this Task fails
	 *
	 * @example
	 * ```typescript
	 * const fetchUser = Task.of(() => fetch('/api/user').then(r => r.json()));
	 * const fetchProfile = (user: User) =>
	 *   Task.of(() => fetch(`/api/profile/${user.id}`).then(r => r.json()));
	 *
	 * const pipeline = fetchUser.andThen(fetchProfile);
	 * const result = await pipeline.run();
	 * ```
	 */
	public andThen<U>(fn: (value: T) => Unit<U>): Task<U> {
		return new Task<U>(() =>
			this.run().then((result) => {
				if (result.isOk()) {
					const nextTask = fn(result.value);
					if (nextTask instanceof Task) {
						return nextTask.run().then((nextResult) => {
							if (nextResult.isOk()) {
								return nextResult.value;
							} else {
								return Promise.reject(nextResult.error);
							}
						});
					} else {
						return Promise.reject(new Error('andThen function must return a Task'));
					}
				} else {
					return Promise.reject(result.error);
				}
			}),
		);
	}

	/**
	 * Executes this Task and returns the result wrapped in a Result type.
	 * This method handles all errors automatically, converting them to Result.err().
	 *
	 * @returns A Promise that resolves to either Result.ok(value) or Result.err(error)
	 *
	 * @example
	 * ```typescript
	 * const task = Task.of(() => Promise.resolve(42));
	 * const result = await task.run();
	 *
	 * if (result.isOk()) {
	 *   console.log('Success:', result.value); // 42
	 * } else {
	 *   console.error('Error:', result.error);
	 * }
	 * ```
	 */
	public async run(): Promise<Result<T, Error>> {
		return this.task()
			.then((value) => Result.ok<T>(value))
			.catch((error) => Result.err<never, Error>(error as Error));
	}

	/**
	 * Executes this Task and converts the result to an Optional.
	 * Successful executions become Some(value), failures become None().
	 *
	 * @returns A Promise that resolves to an Optional containing the result
	 *
	 * @example
	 * ```typescript
	 * const task = Task.of(() => Promise.resolve(42));
	 * const optional = await task.asOptional();
	 *
	 * if (optional.isSome()) {
	 *   console.log('Value:', optional.value); // 42
	 * }
	 * ```
	 */
	public asOptional(): Promise<Optional<T>> {
		return this.run().then((result) => result.asOptional());
	}

	/**
	 * Returns a string representation of this Task.
	 *
	 * @returns A string describing this Task and its underlying function
	 *
	 * @example
	 * ```typescript
	 * const task = Task.of(() => Promise.resolve(42));
	 * console.log(task.toString()); // "Task(() => Promise.resolve(42))"
	 * ```
	 */
	public toString(): string {
		return `Task(${this.task.toString()})`;
	}
}
