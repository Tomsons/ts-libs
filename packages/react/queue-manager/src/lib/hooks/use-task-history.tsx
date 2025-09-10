import { useContext } from 'react';
import { QueueManagerContext } from '../context/queue-manager.context';

/**
 * A hook to access the task history and actions to manage it.
 * @returns An object containing the history, a function to clear the history,
 * and a function to remove a specific task from the history.
 */
export const useTaskHistory = () => {
	const { history, clearHistory, removeTaskFromHistory } = useContext(QueueManagerContext);
	return { history, clearHistory, removeTaskFromHistory };
};
