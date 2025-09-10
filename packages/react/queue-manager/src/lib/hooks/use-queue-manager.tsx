import type { QueueManager } from '@tomsons/queue-manager';
import { useContext } from 'react';
import { QueueManagerContext } from '../context/queue-manager.context';

export const useQueueManager = <T = unknown>() => useContext(QueueManagerContext).manager as unknown as QueueManager<T>;
