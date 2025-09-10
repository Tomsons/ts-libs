import {act, renderHook} from '@testing-library/react';
import {QueueManager} from './queue-manager';
import {useQueueManager} from "./hooks/use-queue-manager";
import {useTaskHistory} from "./hooks/use-task-history";
import {type Task, TaskStatus} from "@tomsons/queue-manager";
import type {PropsWithChildren} from "react";

const createTestTask = (id: string, shouldFail = false): Task<string> => ({
    id,
    execute: () => new Promise((resolve, reject) => {
        setTimeout(() => {
            if (shouldFail) {
                reject(new Error('Task failed'));
            } else {
                resolve('Task completed');
            }
        }, 300);
    }),
});

const wrapper = ({children, ...props}: PropsWithChildren & { autoClearHistoryDelay?: number }) => (
    <QueueManager concurrency={1} {...props}>{children}</QueueManager>
);
describe('React QueueManager', () => {
    it('should provide a queue manager instance', () => {
        const {result} = renderHook(() => useQueueManager(), {wrapper});
        expect(result.current).toBeDefined();
        expect(result.current.enqueue).toBeInstanceOf(Function);
    });

    it('should update task history on task progress', async () => {
        const {result} = renderHook(() => ({
            manager: useQueueManager(),
            history: useTaskHistory().history,
        }), {wrapper});

        const task = createTestTask('task-1');

        await act(async () => {
            result.current.manager.enqueue(task);
            await result.current.manager.waitForCompletion();
        });

        const taskHistory = result.current.history['task-1'];
        expect(taskHistory).toBeDefined();
        expect(taskHistory.length).toBeGreaterThan(0);
        const lastStatus = taskHistory[taskHistory.length - 1];
        expect(lastStatus.status).toBe(TaskStatus.COMPLETED);
    });

    it('should allow clearing the entire history', async () => {
        const {result} = renderHook(() => ({
            manager: useQueueManager(),
            history: useTaskHistory(),
        }), {wrapper});

        const task = createTestTask('task-2');
        await act(async () => {
            result.current.manager.enqueue(task);
            await result.current.manager.waitForCompletion();
        });

        expect(Object.keys(result.current.history.history)).toContain('task-2');

        await act(async () => {
            result.current.history.clearHistory();
        });

        expect(result.current.history.history).toEqual({});
    });

    it('should allow removing a single task from history', async () => {
        const {result} = renderHook(() => ({
            manager: useQueueManager(),
            history: useTaskHistory(),
        }), {wrapper});

        const task1 = createTestTask('task-3');
        const task2 = createTestTask('task-4');
        await act(async () => {
            result.current.manager.enqueue(task1);
            result.current.manager.enqueue(task2);
            await result.current.manager.waitForCompletion();
        });

        expect(Object.keys(result.current.history.history)).toEqual(['task-3', 'task-4']);

        await act(async () => {
            result.current.history.removeTaskFromHistory('task-3');
        });

        expect(Object.keys(result.current.history.history)).toEqual(['task-4']);
    });

    it('should auto-clear completed tasks from history after a delay', async () => {
        vi.useFakeTimers();
        const {result} = renderHook(() => useTaskHistory(), {
            wrapper: (props) => <QueueManager {...props} autoClearHistoryDelay={1000}/>
        });

        const manager = renderHook(() => useQueueManager(), {
            wrapper: (props) => <QueueManager {...props} autoClearHistoryDelay={1000}/>
        }).result.current;

        const task = createTestTask('task-5');

        await act(async () => {
            manager.enqueue(task);
            await vi.advanceTimersByTimeAsync(1100);
        });

        expect(result.current.history).not.toHaveProperty('task-5');
        vi.useRealTimers();
    });
});
