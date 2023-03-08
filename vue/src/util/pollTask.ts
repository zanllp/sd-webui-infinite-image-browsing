// from https://github.com/xiachufang/vue3-ts-util/blob/main/src/task.ts
interface BaseTask<T> {
  /**
   * 任务函数，支持异步
   */
  action: () => T | Promise<T>
  /**
   * 立即执行
   */
  immediately?: boolean
  id?: number
  /**
   * 验证器，action结束后调用，为true时结束当前任务
   */
  validator?: (r: T) => boolean

  errorHandleMethod?: 'stop' | 'ignore'
}

interface PollTask<T> extends BaseTask<T> {
  /**
   * 轮询间隔
   */
  pollInterval: number
}

export type TaskParams<T> = Omit<PollTask<T>, 'id'> // 去掉 PollTask 接口里面的id
export type TaskInst<T> = PollTask<T> & { isFinished: boolean; res?: T }
export class Task {
  /**  为true时，发生错误不打印 */
  static silent = false

  static run<T> (taskParams: TaskParams<T>) {
    const task: TaskInst<T> = {
      immediately: true, // 默认立即执行
      id: -1,
      isFinished: false,
      errorHandleMethod: 'ignore', // 默认忽略action运行错误，在下个时刻正常运行
      ...taskParams
    }
    let onReject: (t: T) => void
    let onResolve: (t: T) => void
    /**
     * 完成时的promise，
     * 主动清理时不resolve
     * */
    const completedTask = new Promise<T>((resolve, reject) => {
      onResolve = resolve // 把resolve提取出来，可以减少一层嵌套
      onReject = reject
    })
    /**
     * 清理轮询任务，多用于在组件卸载时清理
     *
     * @example
     * const { clearTask } = Task.run({....})
     * onMounted(clearTask)
     * */
    const clearTask = () => {
      task.isFinished = true // 两个都要有，刚好action在执行，阻止运行下个action
      clearTimeout(task.id) // action未执行，取消任务
    }
    const runAction = async () => {
      try {
        // eslint-disable-next-line require-atomic-updates
        task.res = await task.action()
        // 没有验证器时认为会手动调用clearTask
        if (task.validator && task.validator(task.res)) {
          onResolve(task.res)
          clearTask()
        }
      } catch (error: any) {
        Task.silent || console.error(error)
        if (task.errorHandleMethod === 'stop') {
          clearTask()
          onReject(error)
        }
      }
    }
    /**
     * 改用settimeout是为了避免可能某个网络请求阻塞了，后面的又开始运行这种情况
     */
    const asyncRunNextAction = () => {
      if (task.isFinished) {
        return
      }
      task.id = setTimeout(async () => {
        await runAction()
        asyncRunNextAction()
      }, task.pollInterval) as any
    }
    /**
     * 严格保证runNextAction在runAction后执行
     */
    setTimeout(async () => {
      task.immediately && await runAction()
      asyncRunNextAction()
    }, 0)
    return {
      task, // task 外部不可变
      clearTask,
      completedTask
    }
  }
}