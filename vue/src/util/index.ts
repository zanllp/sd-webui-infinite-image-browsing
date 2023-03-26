import { idKey, type UniqueId } from 'vue3-ts-util'

export function gradioApp() {
  const elems = parent.document.getElementsByTagName('gradio-app')
  const gradioShadowRoot = elems.length == 0 ? null : elems[0].shadowRoot
  return gradioShadowRoot ? gradioShadowRoot : document;
}

export const asyncCheck = async<T> (getter: () => T, checkSize = 100, timeout = 1000) => {
  return new Promise<T>(x => {
      const check = (num = 0) => {
          const target = getter();
          if (target !== undefined && target !== null) {
              x(target)
          } else if (num > timeout / checkSize) {// 超时
              x(target)
          } else {
              setTimeout(() => check(++num), checkSize);
          }
      };
      check();
  });
}

export const key = (obj: UniqueId) => obj[idKey]
export type Dict<T = any> = Record<string, T>
/**
 * 推导比loadsh好
 * @param v 
 * @param keys 
 */
export const pick = <T extends Dict, keys extends Array<keyof T>> (v: T, ...keys: keys) => {
    return keys.reduce((p, c) => {
      p[c] = v?.[c]
      return p
    }, {} as Pick<T, keys[number]>)
  }
  /**
 * 获取一个异步函数的返回类型，
 *
 * ReturnTypeAsync\<typeof fn\>
 */
export type ReturnTypeAsync<T extends (...arg: any) => Promise<any>> = Awaited<ReturnType<T>>

export function isImageFile(filename: string): boolean {
  if (typeof filename !== 'string') {
    return false
  }
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension !== undefined && imageExtensions.includes(`.${extension}`);
}