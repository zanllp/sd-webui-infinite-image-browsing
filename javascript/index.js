/* eslint-disable */
/* prettier-ignore */
// @ts-nocheck
;(() => {
  /**
   * This is a file generated using `yarn deliver-dist`.
   * If you want to make changes, please modify `index.tpl.js` and run the command to generate it again.
   */
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Expires" content="0" />
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Infinite Image Browsing</title>
    <script type="module" crossorigin src="/infinite_image_browsing/fe-static/assets/index-ecf8fdc1.js"></script>
    <link rel="stylesheet" href="/infinite_image_browsing/fe-static/assets/index-8035c113.css">
  </head>

  <body>
    <div id="zanllp_dev_gradio_fe">
      It seems to have failed to load. You can try refreshing the page. <br> If that doesn't work, click on <a href="https://github.com/zanllp/sd-webui-infinite-image-browsing/issues/90" target="_blank" >FAQ</a> for help</div>
    </div>
    
  </body>
</html>
`
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
