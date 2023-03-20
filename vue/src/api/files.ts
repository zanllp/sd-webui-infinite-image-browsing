import { axiosInst } from '.'

export interface FileNodeInfo {
  size: string
  type: 'file' | 'dir'
  name: string,
  date: string,
  bytes: number
}

export const getTargetFolderFiles = async (target: 'local' | 'netdisk' , folder_path: string) => {
  const resp = await axiosInst.get(`/files/${target}`, { params: { folder_path } })
  return resp.data as { files: FileNodeInfo[] }
}