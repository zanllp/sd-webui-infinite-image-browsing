;(() => {
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Expires" content="0" />
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite App</title>
    <script type="module" crossorigin src="/baidu_netdisk/fe-static/assets/index-92c1f70c.js"></script>
    <link rel="stylesheet" href="/baidu_netdisk/fe-static/assets/index-5b1109d3.css">
  </head>

  <body>
    <div id="zanllp_dev_gradio_fe"></div>
    
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
    () => gradioApp().querySelector('#baidu_netdisk_container_wrapper'),
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
})()
