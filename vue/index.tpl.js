(() => {
  const html = `__built_html__`
  const asyncCheck = async (getter, checkSize = 100, timeout = 1000) => {
    return new Promise(x => {
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
  // eslint-disable-next-line no-undef
  asyncCheck(() => gradioApp().querySelector("#baidu_netdisk_container_wrapper"), 500, Infinity).then((el) => {
    /**
     * @type {HTMLDivElement}
     */
    const wrap = el
    wrap.childNodes.forEach(v => wrap.removeChild(v))
    const iframe = document.createElement('iframe')
    iframe.srcdoc = html 
    const updateHeight = () => {
      iframe.style = `width:100%;height:${(window.innerHeight < 1024) ? '100vh' : (window.innerHeight - 128)}px`
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    wrap.appendChild(iframe)
  })
})()