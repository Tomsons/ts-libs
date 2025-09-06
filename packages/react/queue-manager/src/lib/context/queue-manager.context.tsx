import {createContext, Dispatch, SetStateAction} from "react";
import {QueueManager, TaskProgress} from "@tomsons/queue-manager";

type QueueManagerContextType = {
    manager: QueueManager;
    history: Record<string, TaskProgress[]>;
    setHistory?: Dispatch<SetStateAction<Record<string, TaskProgress[]>>>;
    clearHistory: () => void;
    removeTaskFromHistory: (taskId: string) => void;
};

export const QueueManagerContext = createContext<QueueManagerContextType>({
    manager: {} as QueueManager,
    history: {},
    clearHistory: () => { /* no-op */ },
    removeTaskFromHistory: () => { /* no-op */ },
});
