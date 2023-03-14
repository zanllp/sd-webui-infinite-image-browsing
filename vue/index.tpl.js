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
    iframe.style = "width:100%;height:768px"
    window.addEventListener('message', e => {
      if (e.data.type === 'iframe-size-update') {
        iframe.style = `width:100%;height:${e.data.height + 128}px`
      }
    })
    wrap.appendChild(iframe)
  })
})()