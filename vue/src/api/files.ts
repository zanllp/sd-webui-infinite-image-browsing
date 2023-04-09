import { axiosInst } from '.'

export interface FileNodeInfo {
  size: string
  type: 'file' | 'dir'
  name: string,
  date: string,
  bytes: number
  fullpath: string
}

export const getTargetFolderFiles = async (target: 'local' | 'netdisk' , folder_path: string) => {
  const resp = await axiosInst.get(`/files/${target}`, { params: { folder_path } })
  return resp.data as { files: FileNodeInfo[] }
}

export const deleteFiles = async (target: 'local' | 'netdisk' , file_paths: string[]) => {
  const resp = await axiosInst.post(`/delete_files/${target}`, { file_paths })
  return resp.data as { files: FileNodeInfo[] }
}

export const moveFiles = async (target: 'local' | 'netdisk' , file_paths: string[]) => {
  const resp = await axiosInst.post(`/move_files/${target}`, { file_paths })
  return resp.data as { files: FileNodeInfo[] }
}