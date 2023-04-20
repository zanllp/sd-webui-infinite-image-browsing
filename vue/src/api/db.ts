import { axiosInst } from './index'

interface Tag {
  name: string
  id: number
  type: string
  count: number
}

export const getDbBasicInfo = async () => {
  const resp = await axiosInst.get('/db/basic_info')
  return resp.data as {
    img_count: number,
    tags: Tag[] 
  }
} 

export const InitImageData = async () => {
  await axiosInst.post('/db/update_image_data', {  }, { timeout: Infinity })
}