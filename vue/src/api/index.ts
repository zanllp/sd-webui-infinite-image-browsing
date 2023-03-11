import axios from 'axios'
const axiosInst = axios.create({
  baseURL: '/baidu_netdisk'
})

export const greeting = async () => {
  const resp = await axiosInst.get('hello')
  return resp.data as string
}

export const upload = async () => {
  const resp = await axiosInst.post('upload')
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
  info:
  | UploadTaskDone
  | UploadTaskStart
  | UploadTaskFileStatus
}

/**
 * 获取当前时刻的记录，包含日志输出，文件状态变化
 */
export const getUploadTaskTickStatus = async (id: string) => {
  const resp = await axiosInst.get(`/upload/status/${id}`)
  return resp.data as {
    running: boolean
    tasks: UploadTaskTickStatus[]
  }
}

export interface UploadTaskSummary {
  id: string
  running: boolean
  start_time: string
}

/**
 * 获取指定任务所有上传文件的状态
 * @param id 
 */
export const getUploadTaskFilesState = async (id: string) => {
  const resp = await axiosInst.get(`upload/task/${id}/files_state`)
  return resp.data as {
    files_state: { [x: string]: UploadTaskFileStatus }
  }
}

/**
 * 获取所有上传文件的简介
 */
export const getUploadTasks = async () => {
  const resp = await axiosInst.get('/upload/tasks')
  return resp.data as {
    tasks: UploadTaskSummary[]
  }
}