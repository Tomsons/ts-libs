/**
 * Interface representing a task that can be executed by the queue manager
 * @template T The return type of the task execution
 */
export interface Task<T = unknown> {
    /** Unique identifier for the task */
    id: string;
    /** Function that executes the task and returns a promise */
    execute: (progress: (progress: TaskProgress) => void) => Promise<T>;
    /** Optional priority level for the task */
    priority?: number;
    /** Maximum number of retry attempts */
    maxRetries?: number;
    /** Policy for calculating retry delays */
    retryPolicy?: RetryPolicy;
    /** Function to cancel the task execution */
    cancel?: () => void;
}

/**
 * Enum representing the different states a task can be in
 */
export enum TaskStatus {
    /** Task is waiting to be processed */
    PENDING = 'PENDING',
    /** Task is currently being executed */
    RUNNING = 'RUNNING',
    /** Task has finished successfully */
    COMPLETED = 'COMPLETED',
    /** Task execution failed */
    FAILED = 'FAILED',
    /** Task was cancelled before completion */
    CANCELLED = 'CANCELLED'
}

/**
 * Interface for tracking task progress and status
 */
export interface TaskProgress {
    /** ID of the task being tracked */
    taskId: string;
    /** Progress value between 0-100 */
    progress: number;
    /** Current status of the task */
    status: TaskStatus;
    /** Error details if task failed */
    error?: Error;
}

/**
 * Interface defining how retry delays should be calculated
 */
export interface RetryPolicy {
    /** Function to calculate delay in ms before next retry attempt */
    calculateDelay: (attempt: number) => number;
}

/**
 * Default retry policy using exponential backoff strategy
 */
export const ExponentialBackoff: RetryPolicy = {
    calculateDelay: (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 30000),
};

/**
 * Configuration options for the queue manager
 */
export interface QueueOptions {
    /** Maximum number of concurrent tasks */
    concurrency: number;
    /** Default retry policy for tasks */
    defaultRetryPolicy?: RetryPolicy;
    /** Default maximum retry attempts */
    maxRetries?: number;
}

/**
 * Manages execution of tasks in a FIFO queue with retry capabilities
 * @template T The return type of the tasks
 */
export class QueueManager<T = unknown> {
    private queue: Task<T>[] = [];
    private failedQueue: Task<T>[] = [];
    private running = new Map<string, { task: Task<T>; attempts: number }>();
    private options: QueueOptions;
    private listeners: ((progress: TaskProgress) => void)[] = [];

    /**
     * Creates a new queue manager instance
     * @param options Configuration options for the queue
     */
    constructor(options: QueueOptions) {
        this.options = {
            defaultRetryPolicy: ExponentialBackoff,
            maxRetries: 3,
            ...options,
        };
    }

    /**
     * Returns a copy of the tasks in the failed queue.
     */
    public getFailedTasks(): Task<T>[] {
        return [...this.failedQueue];
    }

    /**
     * Adds a new task to the queue
     * @param task Task to be queued
     */
    public enqueue(task: Task<T>): void {
        this.queue.push({
            ...task,
            priority: task.priority ?? 0,
            retryPolicy: task.retryPolicy ?? this.options.defaultRetryPolicy,
            maxRetries: task.maxRetries ?? this.options.maxRetries,
        });
        this.processQueue();
    }

    /**
     * Re-queues all tasks from the failed queue for processing.
     */
    public reprocessFailedTasks(): void {
        this.failedQueue.forEach(task => this.enqueue(task));
        this.failedQueue = [];
    }

    /**
     * Registers a callback for task progress updates
     * @param callback Function to be called with progress updates
     * @returns Function to unregister the callback
     */
    public onProgress(callback: (progress: TaskProgress) => void): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Clears all pending tasks from the queue
     * @param cancelRunning If true, also cancels currently running tasks
     */
    public clearQueue(cancelRunning: boolean = false): void {
        if (cancelRunning) {
            this.cancelAll();
        }
        this.queue = [];
    }


    /**
     * Waits for all tasks in the queue to complete
     * @returns Promise that resolves when all tasks are finished
     */
    public async waitForCompletion(): Promise<void> {
        if (this.queue.length === 0 && this.running.size === 0) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const checkComplete = () => {
                if (this.queue.length === 0 && this.running.size === 0) {
                    resolve();
                    return;
                }
                setTimeout(checkComplete, 100);
            };
            checkComplete();
        });
    }


    /**
     * Cancels all queued and running tasks
     */
    public async cancelAll(): Promise<void> {
        this.queue = [];
        for (const [taskId, {task}] of this.running) {
            if (task.cancel) {
                task.cancel();
            }
            this.notifyProgress(taskId, 0, TaskStatus.CANCELLED);
        }
        this.running.clear();
    }

    /**
     * Processes the next task in the queue if possible
     */
    private async processQueue(): Promise<void> {
        if (this.running.size >= this.options.concurrency || this.queue.length === 0) {
            return;
        }

        // Sort by priority (higher number is higher priority)
        this.queue.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

        const task = this.queue.shift();
        if (!task) return;

        this.running.set(task.id, {task, attempts: 0});
        this.notifyProgress(task.id, 0, TaskStatus.RUNNING);

        try {
            await this.executeTask(task);
        } catch (error) {
            console.error(`Task ${task.id} failed:`, error);
        }

        this.processQueue();
    }

    /**
     * Executes a single task with retry logic
     * @param task Task to execute
     */
    private async executeTask(task: Task<T>): Promise<void> {
        const runningTask = this.running.get(task.id);
        if (!runningTask) return;

        try {
            await task.execute((progress) => this.notifyProgress(task.id, progress.progress, progress.status, progress.error));
            this.notifyProgress(task.id, 100, TaskStatus.COMPLETED);
            this.running.delete(task.id);
        } catch (error) {
            const {attempts} = runningTask;
            if (attempts < (task.maxRetries ?? this.options.maxRetries!)) {
                const delay = task.retryPolicy!.calculateDelay(attempts);
                this.notifyProgress(task.id, 0, TaskStatus.RUNNING, error as Error); // Notify as running with error for retry
                await new Promise(resolve => setTimeout(resolve, delay));
                this.running.set(task.id, {task, attempts: attempts + 1});
                return this.executeTask(task);
            }

            this.notifyProgress(task.id, 0, TaskStatus.FAILED, error as Error);
            this.failedQueue.push(task);
            this.running.delete(task.id);
        }
    }

    /**
     * Notifies all registered listeners of task progress
     * @param taskId ID of the task
     * @param progress Current progress value
     * @param status Current task status
     * @param error Error if task failed
     */
    private notifyProgress(
        taskId: string,
        progress: number,
        status: TaskStatus,
        error?: Error
    ): void {
        const taskProgress: TaskProgress = {taskId, progress, status, error};
        this.listeners.forEach(listener => listener(taskProgress));
    }
}