/* eslint-disable */
/* prettier-ignore */
// @ts-nocheck
;(() => {
  /**
   * This is a file generated using `yarn deliver-dist`.
   * If you want to make changes, please modify `index.tpl.js` and run the command to generate it again.
   */
  const html = `__built_html__`
  const asyncCheck = async (getter, checkSize = 100, timeout = 1000) => {
    return new Promise((x) => {
      const check = (num = 0) => {
        const target = getter()
        if (target !== undefined && target !== null) {
          x(target)
        } else if (num > timeout / checkSize) {
          // 超时
          x(target)
        } else {
          setTimeout(() => check(++num), checkSize)
        }
      }
      check()
    })
  }
  asyncCheck(
    // eslint-disable-next-line no-undef
    () => gradioApp().querySelector('#infinite_image_browsing_container_wrapper'),
    500,
    Infinity
  ).then((el) => {
    /**
     * @type {HTMLDivElement}
     */
    const wrap = el
    wrap.childNodes.forEach((v) => wrap.removeChild(v))
    const iframe = document.createElement('iframe')
    iframe.srcdoc = html
    iframe.style = `width: 100%;height:100vh`
    wrap.appendChild(iframe)
  })

  const imgTransferBus = new BroadcastChannel("iib-image-transfer-bus");
  imgTransferBus.addEventListener("message", (ev) => {
      const handler = ev.data;
      if (
          handler === "iib_hidden_img_update_trigger" ||
          handler.startsWith("iib_hidden_tab_")
      ) {
          // eslint-disable-next-line no-undef
          const btn = gradioApp().querySelector(`#${handler}`);
          btn.click();
      }
  })
})()
