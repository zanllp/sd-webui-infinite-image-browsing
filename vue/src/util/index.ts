export function gradioApp() {
  const elems = document.getElementsByTagName('gradio-app')
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