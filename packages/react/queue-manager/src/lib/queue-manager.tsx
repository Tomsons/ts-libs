import {PropsWithChildren, useCallback, useEffect, useRef, useState} from "react";
import {QueueManager as CoreQueueManager, QueueOptions, TaskProgress, TaskStatus} from '@tomson/queue-manager';
import {QueueManagerContext} from "./context/queue-manager.context";

type Props = {
    autoClearHistoryDelay?: number;
} & QueueOptions & PropsWithChildren;

export function QueueManager({children, autoClearHistoryDelay, ...managerProps}: Props) {
    const manager = useRef(new CoreQueueManager(managerProps));
    const historyManager = useRef(new CoreQueueManager({
        concurrency: 1,
        maxRetries: 0
    }));
    const [history, setHistory] = useState<Record<string, TaskProgress[]>>({});

    const clearHistory = useCallback(() => {
        setHistory({});
    }, []);

    const removeTaskFromHistory = useCallback((taskId: string) => {
        setHistory(prev => {
            const {[taskId]: _, ...rest} = prev;
            return rest;
        });
    }, []);

    useEffect(() => {
        const unregister = manager.current.onProgress(item => {
            historyManager.current.enqueue({
                id: item.taskId + '-' + Date.now(),
                execute: async () => {
                    setHistory(prev => {
                        if (!prev[item.taskId]) {
                            prev[item.taskId] = [item];
                            return {...prev};
                        }
                        prev[item.taskId].push(item);
                        return {...prev};
                    })

                    if ((item.status === TaskStatus.COMPLETED || item.status === TaskStatus.FAILED) && autoClearHistoryDelay && !isNaN(autoClearHistoryDelay)) {
                        setTimeout(() => {
                            removeTaskFromHistory(item.taskId);
                        }, autoClearHistoryDelay);
                    }
                },
                priority: 1
            });
        });
        return () => unregister();
    }, [setHistory, manager.current, autoClearHistoryDelay, removeTaskFromHistory]);

    return (
        <QueueManagerContext.Provider value={{
            manager: manager.current,
            history: history,
            clearHistory,
            removeTaskFromHistory
        }}>
            {children}
        </QueueManagerContext.Provider>
    );
}