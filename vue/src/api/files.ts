import { axiosInst } from '.'

export interface FileNodeInfo {
  size: string
  type: 'file' | 'dir'
  created_time: string
  name: string
  date: string
  bytes: number
  fullpath: string
  is_under_scanned_path: boolean
  gen_info_raw?: string
  gen_info_obj?: object
}

export interface GenDiffInfo {
  empty: boolean
  ownFile: string
  otherFile: string
  diff: any
}

export const getTargetFolderFiles = async (folder_path: string) => {
  const resp = await axiosInst.value.get('/files', { params: { folder_path } })
  return resp.data as { files: FileNodeInfo[] }
}

export const deleteFiles = async (file_paths: string[]) => {
  const resp = await axiosInst.value.post('/delete_files', { file_paths })
  return resp.data as { files: FileNodeInfo[] }
}

export const moveFiles = async (
  file_paths: string[],
  dest: string,
  create_dest_folder?: boolean
) => {
  const resp = await axiosInst.value.post('/move_files', { file_paths, dest, create_dest_folder })
  return resp.data as { files: FileNodeInfo[] }
}

export const copyFiles = async (
  file_paths: string[],
  dest: string,
  create_dest_folder?: boolean
) => {
  const resp = await axiosInst.value.post('/copy_files', { file_paths, dest, create_dest_folder })
  return resp.data as { files: FileNodeInfo[] }
}

export const mkdirs = async (dest_folder: string) => {
  await axiosInst.value.post('/mkdirs', { dest_folder })
}
