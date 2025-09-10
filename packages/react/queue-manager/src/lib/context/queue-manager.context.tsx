import type { QueueManager, TaskProgress } from '@tomsons/queue-manager';
import { createContext, type Dispatch, type SetStateAction } from 'react';

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
	clearHistory: () => {
		/* no-op */
	},
	removeTaskFromHistory: () => {
		/* no-op */
	},
});
