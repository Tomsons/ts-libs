# Concrete Tasks for Queue Manager

A collection of pre-built, concrete task implementations designed to work seamlessly with `@tomsons/queue-manager`. This library aims to speed up integration by providing ready-to-use solutions for common asynchronous operations.

## Installation

To use these tasks, you'll need both the core queue manager and this library.

```bash
# With npm
npm install @tomsons/queue-manager @tomsons/concrete-tasks

# With yarn
yarn add @tomsons/queue-manager @tomsons/concrete-tasks

# With pnpm
pnpm add @tomsons/queue-manager @tomsons/concrete-tasks
```

## Available Tasks

### `FileUploadTask`

A robust task for handling file uploads with support for progress reporting and cancellation. It's designed to be flexible, allowing you to use any HTTP client (like `fetch` or `axios`) via a `streamConsumer` function.

#### Basic Usage

Here's how to use `FileUploadTask` with `@tomsons/queue-manager` and the native `fetch` API.

```typescript
import { QueueManager } from '@tomsons/queue-manager';
import { FileUploadTask } from '@tomsons/concrete-tasks';

const queueManager = new QueueManager({ concurrency: 2 });

// Assuming 'myFile' is a File object from an input element
const uploadTask = new FileUploadTask({
  id: `upload-${myFile.name}`,
  file: myFile,
  streamConsumer: async ({ stream, abortController }) => {
    // This function performs the actual upload
    return fetch('https://api.example.com/upload', {
      method: 'POST',
      body: stream,
      signal: abortController.signal,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': myFile.size.toString()
      }
    });
  }
});

queueManager.enqueue(uploadTask);
```

#### The `streamConsumer`

The `streamConsumer` is the core of the `FileUploadTask`. It's a function you provide that receives a `ReadableStream` of the file's content and an `AbortController`. Your responsibility is to consume this stream and perform the upload. This design makes the task compatible with any upload library or API.

**With `fetch`:**

```typescript
import { StreamConsumer } from '@tomsons/concrete-tasks';

const fetchUploader: StreamConsumer<Response> = async ({ stream, abortController }) => {
  return fetch('https://api.example.com/upload', {
    method: 'POST',
    body: stream,
    signal: abortController.signal,
    headers: { 'Content-Type': 'application/octet-stream' }
  });
};
```

**With `axios`:**

```typescript
import { StreamConsumer } from '@tomsons/concrete-tasks';
import axios, { AxiosResponse } from 'axios';

const axiosUploader: StreamConsumer<AxiosResponse> = async ({ stream, abortController }) => {
  return axios.post('https://api.example.com/upload', stream, {
    signal: abortController.signal,
    headers: { 'Content-Type': 'application/octet-stream' }
  });
};
```

#### API (`FileUploadTaskProps`)

These are the properties you pass to the `FileUploadTask` constructor.

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | **Required.** A unique identifier for the task. |
| `file` | `File` | **Required.** The `File` object to be uploaded. |
| `streamConsumer` | `StreamConsumer<T>` | **Required.** The function that consumes the file stream and performs the upload. |
| `priority` | `number` | *Optional.* The task's priority. Higher numbers are processed first. |
| `maxRetries` | `number` | *Optional.* Overrides the default maximum number of retries for this task. |
| `retryPolicy` | `RetryPolicy` | *Optional.* Overrides the default retry policy for this task. |

## Building

Run `nx build concrete-tasks` to build the library.

## Running unit tests

Run `nx test concrete-tasks` to execute the unit tests via [Vitest](https://vitest.dev/).
