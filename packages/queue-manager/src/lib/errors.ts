export class TaskError<Context> extends Error {

  constructor(message: string, public context?: Context) {
    super(message)
    this.name = this.constructor.name
  }
}

export const TaskExecutionError = <Context>(message: string) => {
  return class extends TaskError<Context> {
    constructor(props?: Context) {
      super(message, props)
    }
  }
}

export class TaskTimeoutError extends TaskExecutionError<{
  timeout: number
  taskId: string
}>('Task timed out') {}

