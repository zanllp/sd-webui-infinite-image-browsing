import { execSync } from 'child_process'
import { readFile, rm, writeFile } from 'fs/promises'

const main = async () => {
  console.log(execSync("yarn build").toString())
  try {
    await rm("../javascript/index.js")
  // eslint-disable-next-line no-empty
  } catch (error) {
    
  }
  const html = (await readFile("dist/index.html")).toString()
  const js = (await readFile("index.tpl.js")).toString().replace("__built_html__", html)
  await writeFile("../javascript/index.js", js)
}
main()