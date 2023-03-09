import { execSync } from 'child_process'
import { readdir, readFile, rm, writeFile } from 'fs/promises'

const main = async () => {
  console.log(execSync("yarn build").toString())
  try {
    await rm("../style.css")
    await rm("../javascript/index.js")
  // eslint-disable-next-line no-empty
  } catch (error) {
    
  }
  const dir = readdir("dist/assets")
  for (const file of await dir) {
    if (file.endsWith(".js")) {
      const js = await readFile("dist/assets/" + file)
      writeFile("../javascript/index.js", js)
    }
    if (file.endsWith(".css")) {
      const css = await readFile("dist/assets/" + file)
      writeFile("../style.css", css)
    }
  }
}
main()