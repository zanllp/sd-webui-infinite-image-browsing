import { axiosInst } from '.'

export interface FileNodeInfo {
  size: string
  type: 'file' | 'dir'
  created_time: string
  name: string
  date: string
  bytes: number
  fullpath: string
}

export const getTargetFolderFiles = async (folder_path: string) => {
  const resp = await axiosInst.get(`/files`, { params: { folder_path } })
  return resp.data as { files: FileNodeInfo[] }
}

export const deleteFiles = async (file_paths: string[]) => {
  const resp = await axiosInst.post(`/delete_files`, { file_paths })
  return resp.data as { files: FileNodeInfo[] }
}

export const moveFiles = async (
  file_paths: string[],
  dest: string
) => {
  const resp = await axiosInst.post(`/move_files`, { file_paths, dest })
  return resp.data as { files: FileNodeInfo[] }
}
