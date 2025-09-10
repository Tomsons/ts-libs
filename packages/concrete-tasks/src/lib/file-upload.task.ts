import type {Task, TaskProgress} from '@tomsons/queue-manager';

/**
 * Properties passed to the stream consumer function
 * @template T The type of data that will be returned by the consumer
 */
type StreamConsumerProps = {
    /** The ReadableStream containing the file data */
    stream: ReadableStream;
    /** AbortController instance that can be used to cancel the upload */
    abortController: AbortController;
}

/**
 * Function that consumes a ReadableStream and performs the upload
 * @template T The type of data that will be returned after successful upload
 */
type StreamConsumer<T> = (props: StreamConsumerProps) => Promise<T>;

type FileUploadTaskResult<T> = {
    data: T;
}

/**
 * Properties for creating a FileUploadTask
 * @template T The type of data that will be returned after successful upload
 *
 * @example Using with fetch:
 * ```typescript
 * const fetchUploader: StreamConsumer<Response> = async ({ stream, abortController }) => {
 *   return fetch('https://api.example.com/upload', {
 *     method: 'POST',
 *     body: stream,
 *     signal: abortController.signal,
 *     headers: { 'Content-Type': 'application/octet-stream' }
 *   });
 * };
 *
 * const task = new FileUploadTask({
 *   id: 'upload-1',
 *   file: myFile,
 *   streamConsumer: fetchUploader
 * });
 * ```
 *
 * @example Using with axios:
 * ```typescript
 * const axiosUploader: StreamConsumer<AxiosResponse> = async ({ stream, abortController }) => {
 *   return axios.post('https://api.example.com/upload', stream, {
 *     signal: abortController.signal,
 *     headers: { 'Content-Type': 'application/octet-stream' }
 *   });
 * };
 *
 * const task = new FileUploadTask({
 *   id: 'upload-1',
 *   file: myFile,
 *   streamConsumer: axiosUploader
 * });
 * ```
 */
export type FileUploadTaskProps<T> = {
    /** Unique identifier for the task */
    id: string;
    /** File to be uploaded */
    file: File
    /** Function that performs the actual upload */
    streamConsumer: StreamConsumer<T>;
} & Pick<Task<T>, 'priority' | 'retryPolicy' | 'maxRetries' | 'timeout'>;


/**
 * Task implementation for uploading files with progress tracking
 * @template T The type of data that will be returned by the stream consumer
 * @template Result The final result type, defaults to FileUploadTaskResult<T>
 *
 * @example Basic usage with QueueManager:
 * ```typescript
 * const queueManager = new QueueManager({ concurrency: 2 });
 *
 * const uploadTask = new FileUploadTask({
 *   id: 'upload-1',
 *   file: myFile,
 *   streamConsumer: async ({ stream, abortController }) => {
 *     return fetch('https://api.example.com/upload', {
 *       method: 'POST',
 *       body: stream,
 *       signal: abortController.signal
 *     });
 *   }
 * });
 *
 * queueManager.enqueue(uploadTask);
 * ```
 */
export class FileUploadTask<T, Result = FileUploadTaskResult<T>> implements Task<Result> {
    public readonly id: string;
    public readonly priority?;
    public readonly maxRetries?;
    public readonly retryPolicy?;
    public readonly timeout?;
    private readonly streamConsumer: StreamConsumer<T>;
    private readonly file: File;
    private abortController?: AbortController;
    constructor({ id, streamConsumer, file, priority, maxRetries, retryPolicy, timeout }: FileUploadTaskProps<T>) {
        this.id = id;
        this.streamConsumer = streamConsumer;
        this.file = file;
        this.priority = priority;
        this.maxRetries = maxRetries;
        this.retryPolicy = retryPolicy;
        this.timeout = timeout;
    }

    public execute = async (progress: (progress: TaskProgress) => void): Promise<Result> => {
        this.abortController = new AbortController();
        const stream = this.file.stream();
        const totalSize = this.file.size;
        const taskId = this.id;
        const abortSignal = this.abortController.signal;
        let bytesRead = 0;

        const reader = stream.getReader();
        const transformedStream = new ReadableStream({
            async start(controller) {
                try {
                    while (!abortSignal.aborted) {
                        const {done, value} = await reader.read();
                        if (done) break;

                        bytesRead += value.length;
                        progress({
                            taskId,
                            progress: Math.min((bytesRead / totalSize) * 100, 100),
                            status: 'RUNNING' as any,
                            date: new Date()
                        });

                        controller.enqueue(value);
                    }
                    controller.close();
                } catch (error) {
                    controller.error(error);
                } finally {
                    reader.releaseLock();
                }
            }
        });

        const data = await this.streamConsumer({
            stream: transformedStream,
            abortController: this.abortController
        });
        return {data} as Result;
    }

    public cancel = (): void => {
        this.abortController?.abort();
    }
}

