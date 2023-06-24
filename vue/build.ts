import { execSync } from 'child_process'
import { readFile, rm, writeFile } from 'fs/promises'
import { exit } from 'process'

const main = async () => {
  try {
    console.log(execSync('vue-tsc && vite build').toString('utf8'))
  } catch (error: any) {
    if (error.stdout && error.stderr) {
      console.log(error.stdout.toString('utf8'))
      console.error(error.stderr.toString('utf8'))
      exit(2)
    } else {
      throw error
    }
  }
  try {
    await rm('../javascript/index.js')
    // eslint-disable-next-line no-empty
  } catch (error) {

  }
  const html = (await readFile('dist/index.html')).toString()
  const js = (await readFile('index.tpl.js')).toString().replace('__built_html__', html)
  await writeFile('../javascript/index.js', js)
}
main()
