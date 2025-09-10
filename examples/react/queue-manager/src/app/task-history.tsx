import {useTaskHistory} from "@tomsons/react-queue-manager";
import {type TaskProgress, TaskStatus} from "@tomsons/queue-manager";

type Props = {
    taskId: string;
    progresses: TaskProgress[];
    onDelete: (taskId: string) => void;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: 'bg-blue-500',
    [TaskStatus.RUNNING]: 'bg-blue-500',
    [TaskStatus.COMPLETED]: 'bg-green-500',
    [TaskStatus.FAILED]: 'bg-red-500',
    [TaskStatus.CANCELLED]: 'bg-gray-500',
};

const TrashIcon = () => (
    // biome-ignore lint/a11y/noSvgWithoutTitle: <explanation>
<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
              clipRule="evenodd"/>
    </svg>
);


function TaskHistoryItem({taskId, progresses, onDelete}: Props) {
    const lastProgress = progresses[progresses.length - 1];
    if (!lastProgress) return null;

    const colorClass = STATUS_COLORS[lastProgress.error ? TaskStatus.FAILED : lastProgress.status] || 'bg-gray-500';
    const progressPercentage = lastProgress.status === TaskStatus.COMPLETED || lastProgress.error ? 100 : lastProgress.progress;
    const canBeDeleted = lastProgress.status === TaskStatus.COMPLETED || lastProgress.status === TaskStatus.FAILED;

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700 truncate" title={taskId}>{taskId}</h3>
                <div className="flex items-center space-x-4">
                    <span className="text-xs font-semibold uppercase">{lastProgress.status}</span>
                    {canBeDeleted && (
                        <button
                            type="button"
                            onClick={() => onDelete(taskId)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            aria-label={`Delete task ${taskId}`}
                        >
                            <TrashIcon/>
                        </button>
                    )}
                </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                    className={`${colorClass} h-2.5 rounded-full transition-all duration-300 ease-in-out`}
                    style={{width: `${progressPercentage}%`}}
                ></div>
            </div>
            {(lastProgress.status === TaskStatus.FAILED || lastProgress.error) && (
                <p className="text-red-600 text-xs mt-2">Error: {lastProgress?.error?.message}</p>
            )}
        </div>
    );
}

export const TaskHistory = () => {
    const { history, clearHistory, removeTaskFromHistory} = useTaskHistory();
    const taskIds = Object.keys(history);

    return (
        <div className="bg-gray-100 p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-center">Upload Progress</h2>
                {taskIds.length > 0 && (
                    <button
                        type="button"
                        onClick={clearHistory}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Clear All
                    </button>
                )}
            </div>
            {taskIds.length === 0 ? (
                <p className="text-center text-gray-500">No tasks have been queued yet.</p>
            ) : (
                <div>
                    {taskIds.map((taskId) => (
                        <TaskHistoryItem
                            key={taskId}
                            taskId={taskId}
                            progresses={history[taskId]}
                            onDelete={() => removeTaskFromHistory(taskId)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};