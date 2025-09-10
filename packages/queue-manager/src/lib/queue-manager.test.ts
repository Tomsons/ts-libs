import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';
import {QueueManager, Task, TaskStatus} from './queue-manager.js';

let server: Server;
let serverUrl: string;
let serverShouldFail = false;

// Helper to start a test server
const startTestServer = () => {
  return new Promise<void>((resolve) => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.method === 'POST' && req.url === '/simple-post') {
        if (serverShouldFail) {
          res.writeHead(500);
          res.end('Server error');
          return;
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk.toString()));
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(body);
        });
      } else if (req.method === 'POST' && req.url === '/upload') {
        req.on('data', () => { /* consume data */ });
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Upload complete' }));
        });
      } else if (req.method === 'GET' && req.url === '/cancellable') {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Long process complete' }));
        }, 2000); // 2-second delay to allow for cancellation
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(0, () => {
      const address = server.address();
      if (typeof address === 'string') {
        serverUrl = address;
      } else if (address) {
        serverUrl = `http://localhost:${address.port}`;
      }
      resolve();
    });
  });
};

// Helper to stop the test server
const stopTestServer = () => {
  return new Promise<void>((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
};

describe('QueueManager Integration Tests', () => {
  beforeAll(async () => {
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it('should handle failed tasks and allow reprocessing', async () => {
    const queueManager = new QueueManager({ concurrency: 1, maxRetries: 1 });
    const progressSpy = vi.fn();
    queueManager.onProgress(progressSpy);

    const task: Task<Response> = {
      id: 'failing-task-1',
      execute: () => fetch(`${serverUrl}/simple-post`, {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      }).then(res => res.ok ? res : Promise.reject(new Error('Request failed'))),
    };

    // 1. Make server fail and process task
    serverShouldFail = true;
    queueManager.enqueue(task);
    await queueManager.waitForCompletion();

    expect(queueManager.getFailedTasks()).toHaveLength(1);
    const failedCall = progressSpy.mock.calls.find(c => c[0].status === TaskStatus.FAILED);
    expect(failedCall).toBeDefined();

    // 2. "Fix" server and reprocess
    serverShouldFail = false;
    queueManager.reprocessFailedTasks();
    await queueManager.waitForCompletion();

    expect(queueManager.getFailedTasks()).toHaveLength(0);
    const completedCall = progressSpy.mock.calls.find(c => c[0].status === TaskStatus.COMPLETED);
    expect(completedCall).toBeDefined();
    expect(completedCall![0].taskId).toBe('failing-task-1');
  });

  it('should execute a simple POST request task', async () => {
    const queueManager = new QueueManager({ concurrency: 1 });
    const progressSpy = vi.fn();
    queueManager.onProgress(progressSpy);

    const task: Task<Response> = {
      id: 'post-task-1',
      execute: () => fetch(`${serverUrl}/simple-post`, {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: { 'Content-Type': 'application/json' },
      }).catch(err => {
          throw err;
      }),
    };

    queueManager.enqueue(task);
    await queueManager.waitForCompletion();

    const completedCall = progressSpy.mock.calls.find(c => c[0].status === TaskStatus.COMPLETED);
    expect(completedCall).toBeDefined();
    expect(completedCall![0]).toMatchObject({
      taskId: 'post-task-1',
      status: TaskStatus.COMPLETED,
      progress: 100,
    });
  });

  it('should execute a file upload task and report progress', async () => {
    const queueManager = new QueueManager({ concurrency: 1 });
    const progressSpy = vi.fn();
    queueManager.onProgress(progressSpy);

    const fileSize = 1024 * 1024; // 1MB
    const buffer = Buffer.alloc(fileSize, 'a');
    let uploadedBytes = 0;

    const task: Task<Response> = {
      id: 'upload-task-1',
      execute: (progress) => {
        const stream = new Readable({
          read() {
            const chunkSize = 64 * 1024; // 64KB
            const chunk = buffer.subarray(uploadedBytes, uploadedBytes + chunkSize);
            if (chunk.length > 0) {
              this.push(chunk);
              uploadedBytes += chunk.length;
              const progressPercentage = Math.round((uploadedBytes / fileSize) * 100);
              progress({ taskId: 'upload-task-1', progress: progressPercentage, status: TaskStatus.RUNNING });
            } else {
              this.push(null); // End of stream
            }
          },
        });

        // @ts-ignore: ReadableStream is compatible with BodyInit in Node.js fetch
        return fetch(`${serverUrl}/upload`, { method: 'POST', body: stream, duplex: 'half' });
      },
    };

    queueManager.enqueue(task);
    await queueManager.waitForCompletion();

    const runningCalls = progressSpy.mock.calls.filter(c => c[0].status === TaskStatus.RUNNING);
    expect(runningCalls.length).toBeGreaterThan(1);
    expect(runningCalls[runningCalls.length - 1][0].progress).toBe(100);

    const completedCall = progressSpy.mock.calls.find(c => c[0].status === TaskStatus.COMPLETED);
    expect(completedCall).toBeDefined();
  });

  it('should cancel a running task using an AbortController', async () => {
    const queueManager = new QueueManager({ concurrency: 1 });
    const progressSpy = vi.fn();
    queueManager.onProgress(progressSpy);

    const abortController = new AbortController();

    const task: Task<Response> = {
      id: 'cancellable-task-1',
      execute: () => fetch(`${serverUrl}/cancellable`, { signal: abortController.signal }),
      cancel: () => abortController.abort(),
    };

    queueManager.enqueue(task);

    // Wait a moment for the task to start running
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now cancel all tasks
    await queueManager.cancelAll();

    const runningCall = progressSpy.mock.calls.find(c => c[0].status === TaskStatus.RUNNING);
    expect(runningCall).toBeDefined();

    const cancelledCall = progressSpy.mock.calls.find(c => c[0].status === TaskStatus.CANCELLED);
    expect(cancelledCall).toBeDefined();
    expect(cancelledCall![0].taskId).toBe('cancellable-task-1');

    // The queue should be empty
    await expect(queueManager.waitForCompletion()).resolves.toBeUndefined();
  });
});
