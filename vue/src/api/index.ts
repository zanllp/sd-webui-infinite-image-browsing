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

export const getUploadTaskStatus = async (id: string) => {
  const resp = await axiosInst.get(`/upload/status/${id}`)
  return resp.data as {
    running: boolean,
    msgs: string[]
  }
}