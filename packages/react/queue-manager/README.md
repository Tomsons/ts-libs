# @tomsons/react-queue-manager

React bindings for `@tomsons/queue-manager`. This library provides a React Provider and hooks to seamlessly integrate the powerful queueing capabilities into your React applications.

## Features

- **React Provider**: A simple `<QueueManager>` provider to wrap your application.
- **Easy Access via Hooks**: `useQueueManager` to access the core queue manager instance and `useTaskHistory` to track task progress.
- **Automatic History Tracking**: Automatically captures the progress of all enqueued tasks.
- **History Management**: Hooks provide functions to clear the entire history or remove individual tasks.
- **Auto-Cleanup**: Optional automatic removal of completed or failed tasks from the history after a delay.

## Installation

This package has a peer dependency on `@tomsons/queue-manager`.

```bash
# With npm
npm install @tomsons/queue-manager @tomsons/react-queue-manager

# With yarn
yarn add @tomsons/queue-manager @tomsons/react-queue-manager

# With pnpm
pnpm add @tomsons/queue-manager @tomsons/react-queue-manager
```

## How to Use

### 1. Wrap your App in the Provider

Wrap your application (or the relevant part of it) with the `QueueManager` provider. You can pass any `QueueOptions` (like `concurrency`) as props.

```typescriptreact
// In your App.tsx or equivalent
import { QueueManager } from '@tomsons/react-queue-manager';
import { MyAppComponent } from './MyAppComponent';

function App() {
  return (
    <QueueManager concurrency={4} maxRetries={3}>
      <MyAppComponent />
    </QueueManager>
  );
}
```

### 2. Use the Hooks in your Components

#### `useQueueManager`

This hook gives you access to the core `QueueManager` instance, which you can use to enqueue tasks.

```typescriptreact
import { useQueueManager } from '@tomsons/react-queue-manager';
import { Task } from '@tomsons/queue-manager';

const MyTaskComponent = () => {
  const queueManager = useQueueManager();

  const handleAddTask = () => {
    const myTask: Task<void> = {
      id: 'my-unique-task-id',
      execute: async () => {
        console.log('Executing task...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    };
    queueManager.enqueue(myTask);
  };

  return <button onClick={handleAddTask}>Add Task</button>;
};
```

#### `useTaskHistory`

This hook provides access to the task history and functions to manage it. It returns an object with `history`, `clearHistory`, and `removeTaskFromHistory`.

```typescriptreact
import { useTaskHistory } from '@tomsons/react-queue-manager';

const TaskHistoryDisplay = () => {
  const { history, clearHistory, removeTaskFromHistory } = useTaskHistory();

  return (
    <div>
      <h2>Task History</h2>
      <button onClick={clearHistory}>Clear All</button>
      <ul>
        {Object.entries(history).map(([taskId, progresses]) => {
          const lastProgress = progresses[progresses.length - 1];
          return (
            <li key={taskId}>
              {taskId}: {lastProgress.status}
              <button onClick={() => removeTaskFromHistory(taskId)}>Delete</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
```

## Provider Props

| Prop | Type | Description |
| :--- | :--- | :--- |
| `concurrency` | `number` | *Optional.* The maximum number of tasks to run at once. |
| `maxRetries` | `number` | *Optional.* The default number of retries for failed tasks. |
| `defaultRetryPolicy` | `RetryPolicy` | *Optional.* The default backoff strategy for retries. |
| `autoClearHistoryDelay` | `number` | *Optional.* Time in milliseconds to wait before automatically removing a completed or failed task from the history. |

## Working Example

A fully functional example demonstrating file uploads with progress bars and history management can be found in the `examples/react/queue-manager` directory of this repository.

## Running unit tests

Run `nx test @tomsons/react-queue-manager` to execute the unit tests via [Vitest](https://vitest.dev/).
