import axios from 'axios'
import type { GlobalSettingPart } from './type'
const axiosInst = axios.create({
  baseURL: '/baidu_netdisk'
})

export const greeting = async () => {
  const resp = await axiosInst.get('hello')
  return resp.data as string
}
interface BaiduYunTaskCreateReq {
  type: 'upload' | 'download'
  send_dirs: string
  recv_dir: string
}
export const createBaiduYunTask = async (req: BaiduYunTaskCreateReq) => {
  const resp = await axiosInst.post('task', req)
  return resp.data as {
    id: string
  }
}

interface UploadTaskStart {
  status: 'start'
  concurrent: number
}

interface UploadTaskFileSkipped {
  status: 'file-skipped'
  id: string
}

interface UploadTaskPreparing {
  id: string
  status: 'upload-preparing'
  local_file_path: string
}

interface UploadTaskSuccess {
  id: string
  status: 'upload-success'
  baidu_netdisk_saved_path: string
}

interface UploadTaskFastuploadFailed {
  id: string
  status: 'fast-upload-failed'
}

interface UploadTaskFailed {
  id: string
  status: 'upload-failed'
  extra_info: string
}

interface UploadTaskDone {
  status: 'done'
}

interface UploadTaskQueued {
  id: string
  status: 'queued'
  local_file_path: string
}

export type UploadTaskFileStatus =
  | UploadTaskFastuploadFailed
  | UploadTaskFileSkipped
  | UploadTaskPreparing
  | UploadTaskQueued
  | UploadTaskSuccess
  | UploadTaskFailed

export interface UploadTaskTickStatus {
  log: string
  info: UploadTaskDone | UploadTaskStart | UploadTaskFileStatus
}

/**
 * 获取当前时刻的记录，包含日志输出，文件状态变化
 */
export const getUploadTaskTickStatus = async (id: string) => {
  const resp = await axiosInst.get(`/task/${id}/tick`)
  return resp.data as {
    tasks: UploadTaskTickStatus[],
    task_summary: UploadTaskSummary
  }
}

export interface UploadTaskSummary {
  id: string
  running: boolean
  start_time: string
  send_dirs: string
  recv_dir: string
  type: 'upload' | 'download'
  n_files: number
  n_failed_files: number
  n_success_files: number
}

/**
 * 获取指定任务所有上传文件的状态
 * @param id
 */
export const getUploadTaskFilesState = async (id: string) => {
  const resp = await axiosInst.get(`/task/${id}/files_state`)
  return resp.data as {
    files_state: { [x: string]: UploadTaskFileStatus }
  }
}

/**
 * 获取所有上传文件的简介
 */
export const getUploadTasks = async () => {
  const resp = await axiosInst.get('/tasks')
  return resp.data as {
    tasks: UploadTaskSummary[]
  }
}

export const getGlobalSetting = async () => {
  const resp = await axiosInst.get('/global_setting')
  return resp.data as {
    global_setting: GlobalSettingPart,
    default_conf: {
      upload_dir: string
    }
  }
}
