import {useContext} from "react";
import {QueueManagerContext} from "../context/queue-manager.context";
import {QueueManager} from "@tomson/queue-manager";

export const useQueueManager = <T = unknown>() => useContext(QueueManagerContext).manager as unknown as QueueManager<T>;