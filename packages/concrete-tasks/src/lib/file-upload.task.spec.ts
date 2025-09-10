import { describe, expect, it, vi } from 'vitest';
import { FileUploadTask, type FileUploadTaskProps } from './file-upload.task.js';

// Mock the File API for Node.js environment
class MockFile {
	private content: Uint8Array[];
	size: number;

	constructor(content: string[], options?: { type: string }) {
		this.content = content.map((str) => new TextEncoder().encode(str));
		this.size = this.content.reduce((acc, chunk) => acc + chunk.length, 0);
	}

	stream(): ReadableStream<Uint8Array> {
		let i = 0;
		return new ReadableStream({
			pull: (controller) => {
				if (i < this.content.length) {
					controller.enqueue(this.content[i]);
					i++;
				} else {
					controller.close();
				}
			},
		});
	}
}

global.File = MockFile as any;

describe('FileUploadTask', () => {
	const createTestTask = (props: Partial<FileUploadTaskProps<string>> = {}) => {
		const file = new File(['chunk1', 'chunk2', 'chunk3'], 'test.txt', { type: 'text/plain' });
		const streamConsumer = vi.fn().mockImplementation(
			({ stream, abortController }) =>
				new Promise((resolve, reject) => {
					const reader = stream.getReader();
					const chunks: string[] = [];
					const read = () => {
						reader
							.read()
							.then(({ done, value }: any) => {
								if (done) {
									resolve('consumer-result');
									return;
								}
								chunks.push(new TextDecoder().decode(value));
								// Simulate async processing delay
								setTimeout(read, 10);
							})
							.catch((err: Error) => {
								if (abortController.signal.aborted) {
									reject(new DOMException('Aborted', 'AbortError'));
								} else {
									reject(err);
								}
							});
					};
					read();
				}),
		);
		const task = new FileUploadTask({
			id: 'test-upload',
			file: file as any,
			streamConsumer,
			...props,
		});
		return { task, streamConsumer, file };
	};

	it('should construct with provided properties', () => {
		const { task } = createTestTask({
			id: 'custom-id',
			priority: 10,
			maxRetries: 5,
		});

		expect(task.id).toBe('custom-id');
		expect(task.priority).toBe(10);
		expect(task.maxRetries).toBe(5);
	});

	it('should execute, report progress, and return consumer data', async () => {
		const { task, streamConsumer } = createTestTask();
		const progressCallback = vi.fn();

		const result = await task.execute(progressCallback);

		// Check stream consumer call
		expect(streamConsumer).toHaveBeenCalledOnce();
		const consumerArgs = streamConsumer.mock.calls[0][0];
		expect(consumerArgs.stream).toBeInstanceOf(ReadableStream);
		expect(consumerArgs.abortController).toBeInstanceOf(AbortController);

		// Check progress reporting
		expect(progressCallback).toHaveBeenCalled();
		const lastProgressCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
		expect(lastProgressCall.taskId).toBe('test-upload');
		expect(lastProgressCall.progress).toBe(100);
		expect(lastProgressCall.status).toBe('RUNNING');

		// Check final result
		expect(result).toEqual({ data: 'consumer-result' });
	});

	it('should calculate progress correctly based on chunk size', async () => {
		const { task, file } = createTestTask();
		const progressItems: any[] = [];
		const progressCallback = vi.fn().mockImplementation((item) => {
			progressItems.push(item);
		});

		await task.execute(progressCallback);

		const totalSize = file.size; // 'chunk1chunk2chunk3'.length = 18
		const chunk1Size = 'chunk1'.length; // 6
		const chunk2Size = 'chunk2'.length; // 6

		expect(progressCallback).toHaveBeenCalledTimes(3);
		expect(progressCallback.mock.calls[0][0].progress).toBe((chunk1Size / totalSize) * 100); // 33.33
		expect(progressCallback.mock.calls[1][0].progress).toBe(((chunk1Size + chunk2Size) / totalSize) * 100); // 66.67
		expect(progressCallback.mock.calls[2][0].progress).toBe(100);
	});

	it('should be cancellable during execution', async () => {
		const streamConsumer = vi.fn(
			({ abortController }) =>
				new Promise((resolve, reject) => {
					abortController.signal.addEventListener('abort', () => {
						reject(new DOMException('Aborted', 'AbortError'));
					});
				}),
		) as any;
		const { task } = createTestTask({ streamConsumer });

		const executePromise = task.execute(vi.fn());

		// Allow execution to start
		await new Promise((resolve) => setTimeout(resolve, 0));

		task.cancel();

		await expect(executePromise).rejects.toThrow('Aborted');
		expect(streamConsumer.mock.calls[0][0].abortController.signal.aborted).toBe(true);
	});

	it('should propagate errors from the stream consumer', async () => {
		const consumerError = new Error('Consumer failed');
		const { task } = createTestTask({
			streamConsumer: vi.fn().mockRejectedValue(consumerError),
		});

		await expect(task.execute(vi.fn())).rejects.toThrow(consumerError);
	});
});
