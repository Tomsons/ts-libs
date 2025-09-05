import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { QueueManager, Task, TaskStatus } from './queue-manager.js';

interface CreateTestTaskOptions {
  id: string;
  executionTime?: number;
  shouldFail?: boolean;
  cancelFn?: () => void;
  maxRetries?: number;
}

// Helper to create a task with a controllable execution
const createTestTask = ({
  id,
  executionTime = 10,
  shouldFail = false,
  cancelFn,
  maxRetries,
}: CreateTestTaskOptions): { task: Task<string>; execute: Mock } => {
  const execute = vi.fn(
    () =>
      new Promise<string>((resolve, reject) => {
        setTimeout(() => {
          if (shouldFail) {
            reject(new Error(`Task ${id} failed`));
          } else {
            resolve(`Task ${id} completed`);
          }
        }, executionTime);
      })
  );

  return {
    task: { id, execute, cancel: cancelFn, maxRetries },
    execute,
  };
};

describe('QueueManager', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('should enqueue and process a task', async () => {
    const queueManager = new QueueManager({ concurrency: 1 });
    const { task, execute } = createTestTask({ id: 'task1' });
    const progressListener = vi.fn();
    queueManager.onProgress(progressListener);

    queueManager.enqueue(task);
    await queueManager.waitForCompletion();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(progressListener).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task1', status: TaskStatus.RUNNING }));
    expect(progressListener).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task1', status: TaskStatus.COMPLETED, progress: 100 }));
  });

  it('should respect concurrency limits', async () => {
    const queueManager = new QueueManager({ concurrency: 2 });
    const task1 = createTestTask({ id: 'task1', executionTime: 50 });
    const task2 = createTestTask({ id: 'task2', executionTime: 50 });
    const task3 = createTestTask({ id: 'task3', executionTime: 10 });

    queueManager.enqueue(task1.task);
    queueManager.enqueue(task2.task);
    queueManager.enqueue(task3.task);

    // @ts-expect-error Accessing private property for test
    expect(queueManager.running.size).toBe(2);
    // @ts-expect-error Accessing private property for test
    expect(queueManager.queue.length).toBe(1);

    await queueManager.waitForCompletion();

    expect(task1.execute).toHaveBeenCalled();
    expect(task2.execute).toHaveBeenCalled();
    expect(task3.execute).toHaveBeenCalled();
    // @ts-expect-error Accessing private property for test
    expect(queueManager.running.size).toBe(0);
  });

  it('should retry failed tasks', async () => {
    vi.useFakeTimers();
    const queueManager = new QueueManager({ concurrency: 1, maxRetries: 2 });
    const { task, execute } = createTestTask({ id: 'task1', executionTime: 10, shouldFail: true });
    const progressListener = vi.fn();
    queueManager.onProgress(progressListener);

    queueManager.enqueue(task);

    await vi.runAllTimersAsync();

    expect(execute).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    expect(progressListener).toHaveBeenCalledWith(expect.objectContaining({ status: TaskStatus.FAILED, error: expect.any(Error) }));

    // Check final state
    const finalCall = progressListener.mock.calls[progressListener.mock.calls.length - 1][0];
    expect(finalCall).toEqual(expect.objectContaining({ taskId: 'task1', status: TaskStatus.FAILED }));

    vi.useRealTimers();
  });

  it('should use custom retry policy', async () => {
    vi.useFakeTimers();
    const customRetryPolicy = { calculateDelay: vi.fn().mockReturnValue(50) };
    const queueManager = new QueueManager({ concurrency: 1, maxRetries: 1 });
    const { task, execute } = createTestTask({ id: 'task1', executionTime: 10, shouldFail: true });
    task.retryPolicy = customRetryPolicy;

    queueManager.enqueue(task);
    await vi.runAllTimersAsync();

    expect(execute).toHaveBeenCalledTimes(2);
    expect(customRetryPolicy.calculateDelay).toHaveBeenCalledWith(0);
    vi.useRealTimers();
  });

  it('should clear the queue', async () => {
    const queueManager = new QueueManager({ concurrency: 1 });
    const task1 = createTestTask({ id: 'task1', executionTime: 50 });
    const task2 = createTestTask({ id: 'task2', executionTime: 10 });

    queueManager.enqueue(task1.task);
    queueManager.enqueue(task2.task);

    queueManager.clearQueue();
    // @ts-expect-error Accessing private property for test
    expect(queueManager.queue.length).toBe(0);

    await queueManager.waitForCompletion();
    expect(task1.execute).toHaveBeenCalled();
    expect(task2.execute).not.toHaveBeenCalled();
  });

  it('should clear the queue and cancel running tasks', async () => {
    const cancelFn = vi.fn();
    const queueManager = new QueueManager({ concurrency: 1 });
    const { task } = createTestTask({ id: 'task1', executionTime: 50, cancelFn });
    const progressListener = vi.fn();
    queueManager.onProgress(progressListener);

    queueManager.enqueue(task);
    await new Promise(resolve => setTimeout(resolve, 10)); // allow task to start

    queueManager.clearQueue(true);

    expect(cancelFn).toHaveBeenCalled();
    expect(progressListener).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task1', status: TaskStatus.CANCELLED }));
    // @ts-expect-error Accessing private property for test
    expect(queueManager.running.size).toBe(0);
  });

  it('should cancel all tasks', async () => {
    const cancelFn = vi.fn();
    const queueManager = new QueueManager({ concurrency: 1 });
    const task1 = createTestTask({ id: 'task1', executionTime: 50, cancelFn });
    const task2 = createTestTask({ id: 'task2', executionTime: 10 });
    const progressListener = vi.fn();
    queueManager.onProgress(progressListener);

    queueManager.enqueue(task1.task);
    queueManager.enqueue(task2.task);
    await new Promise(resolve => setTimeout(resolve, 10)); // allow task1 to start

    await queueManager.cancelAll();

    expect(cancelFn).toHaveBeenCalled();
    // @ts-expect-error Accessing private property for test
    expect(queueManager.queue.length).toBe(0);
    // @ts-expect-error Accessing private property for test
    expect(queueManager.running.size).toBe(0);
    expect(task2.execute).not.toHaveBeenCalled();
    expect(progressListener).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task1', status: TaskStatus.CANCELLED }));
  });

  it('should wait for completion', async () => {
    const queueManager = new QueueManager({ concurrency: 2 });
    queueManager.enqueue(createTestTask({ id: 'task1', executionTime: 20 }).task);
    queueManager.enqueue(createTestTask({ id: 'task2', executionTime: 30 }).task);

    await queueManager.waitForCompletion();

    // @ts-expect-error Accessing private property for test
    expect(queueManager.running.size).toBe(0);
    // @ts-expect-error Accessing private property for test
    expect(queueManager.queue.length).toBe(0);
  });

  it('should resolve immediately if queue is empty', async () => {
    const queueManager = new QueueManager({ concurrency: 2 });
    await expect(queueManager.waitForCompletion()).resolves.toBeUndefined();
  });

  it('should handle progress updates from within a task', async () => {
    const queueManager = new QueueManager({ concurrency: 1 });
    const progressListener = vi.fn();
    queueManager.onProgress(progressListener);

    const task: Task<void> = {
      id: 'progress-task',
      execute: (progress) => {
        progress({ taskId: 'progress-task', progress: 50, status: TaskStatus.RUNNING });
        return Promise.resolve();
      },
    };

    queueManager.enqueue(task);
    await queueManager.waitForCompletion();

    expect(progressListener).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'progress-task', progress: 50, status: TaskStatus.RUNNING }));
    expect(progressListener).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'progress-task', progress: 100, status: TaskStatus.COMPLETED }));
  });

  it('should unregister progress listeners', async () => {
    const queueManager = new QueueManager({ concurrency: 1 });
    const progressListener = vi.fn();
    const unregister = queueManager.onProgress(progressListener);

    unregister();

    queueManager.enqueue(createTestTask({ id: 'task1' }).task);
    await queueManager.waitForCompletion();

    expect(progressListener).not.toHaveBeenCalled();
  });
});
