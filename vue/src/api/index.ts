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

export interface UploadTaskStatus {
  log: string
  info:
    | UploadTaskDone
    | UploadTaskFastuploadFailed
    | UploadTaskFileSkipped
    | UploadTaskPreparing
    | UploadTaskQueued
    | UploadTaskStart
    | UploadTaskSuccess
    | UploadTaskFailed
}

export const getUploadTaskStatus = async (id: string) => {
  const resp = await axiosInst.get(`/upload/status/${id}`)
  return resp.data as {
    running: boolean
    tasks: UploadTaskStatus[]
  }
}
