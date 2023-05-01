import { axiosInst } from '.'
export interface UserInfo {
  uid: string
  username: string
}
export const getUserInfo = async () => {
  const resp = await axiosInst.get('/user')
  return resp.data as UserInfo | undefined
}

export const loginByBduss = async (bduss: string) => {
  const resp = await axiosInst.post('/user/login', {
    bduss
  })
  return resp.data as UserInfo
}

export const logout = async () => {
  const resp = await axiosInst.post('/user/logout')
  return resp.data as {}
}
