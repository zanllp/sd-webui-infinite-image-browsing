import { execSync } from 'child_process'
import { readdir, readFile, rm, writeFile } from 'fs/promises'

const main = async () => {
  console.log(execSync("yarn build").toString())
  try {
    await rm("../javascript/index.js")
  // eslint-disable-next-line no-empty
  } catch (error) {
    
  }
  const html = await readFile("dist/index.html")
  const js = (await readFile("index.tpl.js")).toString().replace("__built_html__", html)
  await writeFile("../javascript/index.js", js)
}
main()