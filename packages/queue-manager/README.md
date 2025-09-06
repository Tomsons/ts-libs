# Queue Manager

A powerful and flexible queue manager for handling asynchronous tasks in TypeScript applications. It provides features like concurrency control, task prioritization, automatic retries, cancellation, and progress tracking.

## Features

- **Concurrency Control**: Limit the number of tasks that run simultaneously.
- **Task Prioritization**: Higher priority tasks are executed first.
- **Automatic Retries**: Automatically retries failed tasks with configurable backoff strategies (e.g., exponential backoff).
- **Task Cancellation**: Support for cancelling queued and in-progress tasks.
- **Progress Reporting**: Real-time updates on task status and progress.
- **Failed Task Queue**: Failed tasks are moved to a separate queue for later inspection or reprocessing.

## Basic Usage

Here's a simple example of how to use the `QueueManager`.

```typescript
import { QueueManager, Task, TaskStatus } from '@tomsons/queue-manager';

// 1. Create a QueueManager instance
const queueManager = new QueueManager({ concurrency: 2 });

// 2. Listen for progress updates
queueManager.onProgress(progress => {
  console.log(`Task ${progress.taskId} is ${progress.status} - ${progress.progress}%`);
  if (progress.status === TaskStatus.FAILED) {
    console.error(`Task ${progress.taskId} failed with error:`, progress.error);
  }
});

// 3. Define a task
const myTask: Task<string> = {
  id: 'task-1',
  priority: 10, // Higher number means higher priority
  execute: async (reportProgress) => {
    console.log('Executing task-1...');
    // Simulate work and report progress
    await new Promise(resolve => setTimeout(resolve, 500));
    reportProgress({ taskId: 'task-1', progress: 50, status: TaskStatus.RUNNING });
    await new Promise(resolve => setTimeout(resolve, 500));
    return 'Task-1 Finished!';
  }
};

// 4. Enqueue the task
queueManager.enqueue(myTask);

// 5. Wait for all tasks to complete
await queueManager.waitForCompletion();
console.log('All tasks have been processed.');
```

## Advanced Usage: Custom Task Class

For more complex scenarios, you can encapsulate task logic within a class that implements the `Task` interface. This is useful for creating reusable and configurable task types.

Here's an example of a `FileUploadTask` that uploads a file and reports progress.

```typescript
import { QueueManager, Task, TaskProgress, TaskStatus } from '@tomsons/queue-manager';
import fetch from 'node-fetch'; // or use browser's fetch

// Custom class implementing the Task interface
class FileUploadTask implements Task<{ url: string }> {
  id: string;
  priority: number;
  
  private file: Buffer;
  private endpoint: string;
  private abortController: AbortController;

  constructor(file: Buffer, fileName: string, endpoint: string) {
    this.id = `upload-${fileName}`;
    this.priority = 5;
    this.file = file;
    this.endpoint = endpoint;
    this.abortController = new AbortController();
  }

  async execute(reportProgress: (progress: TaskProgress) => void): Promise<{ url: string }> {
    // In a real scenario, you would stream the file and calculate progress.
    // This is a simplified example.
    reportProgress({ taskId: this.id, progress: 0, status: TaskStatus.RUNNING });

    const response = await fetch(this.endpoint, {
      method: 'POST',
      body: this.file,
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
    
    reportProgress({ taskId: this.id, progress: 100, status: TaskStatus.RUNNING });
    return response.json() as Promise<{ url: string }>;
  }

  cancel(): void {
    console.log(`Cancelling upload for ${this.id}`);
    this.abortController.abort();
  }
}

// --- Usage ---
const queue = new QueueManager({ concurrency: 1 });

const fileBuffer = Buffer.from('some file content');
const uploadTask = new FileUploadTask(fileBuffer, 'document.pdf', 'https://api.example.com/upload');

queue.enqueue(uploadTask);

// To cancel the task if it's running
// setTimeout(() => queue.cancelAll(), 50); 
```

## API Reference

### `QueueManager<T>`

| Method | Description |
| :--- | :--- |
| `constructor(options: QueueOptions)` | Creates a new queue manager instance. |
| `getFailedTasks(): Task<T>[]` | Returns a copy of the tasks that have failed all retry attempts. |
| `enqueue(task: Task<T>): void` | Adds a new task to the processing queue. |
| `reprocessFailedTasks(): void` | Re-queues all tasks from the failed queue for another attempt. |
| `onProgress(callback): () => void` | Registers a listener for task progress updates. Returns a function to unregister the listener. |
| `clearQueue(cancelRunning?: boolean): void` | Clears all pending (non-running) tasks. If `cancelRunning` is true, it also cancels tasks that are currently in progress. |
| `waitForCompletion(): Promise<void>` | Returns a promise that resolves when the queue is empty and all running tasks are complete. |
| `cancelAll(): Promise<void>` | Cancels all queued and running tasks. |

### `Task<T>` Interface

This interface defines the structure of a task that can be processed by the `QueueManager`.

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | **Required.** A unique identifier for the task. |
| `execute` | `(progress: (p: TaskProgress) => void) => Promise<T>` | **Required.** The function that performs the task's work. It receives a `reportProgress` callback and must return a `Promise`. |
| `priority` | `number` | *Optional.* The task's priority. Higher numbers are processed first. Defaults to `0`. |
| `maxRetries` | `number` | *Optional.* Overrides the default maximum number of retries for this specific task. |
| `retryPolicy` | `RetryPolicy` | *Optional.* Overrides the default retry policy for this specific task. |
| `cancel` | `() => void` | *Optional.* A function that cancels the task's execution, e.g., by aborting an HTTP request. |

## Building

Run `nx build queue-manager` to build the library.

## Running unit tests

Run `nx test queue-manager` to execute the unit tests via [Vitest](https://vitest.dev/).
