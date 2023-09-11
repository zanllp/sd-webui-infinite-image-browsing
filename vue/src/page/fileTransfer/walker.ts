import { FileNodeInfo, getTargetFolderFiles } from '@/api/files'
import { first } from 'lodash-es'
import { SortMethod, sortFiles } from './fileSort'
import { isMediaFile } from '@/util'

interface TreeNode {
  children: TreeNode[]
  info: FileNodeInfo
}

export class Walker {
  root: TreeNode
  execQueue: { fn: () => Promise<TreeNode>; info: FileNodeInfo }[] = []
  constructor(entryPath: string, private sortMethod = SortMethod.CREATED_TIME_DESC) {
    this.root = {
      children: [],
      info: {
        name: entryPath,
        size: '-',
        bytes: 0,
        created_time: '',
        is_under_scanned_path: true,
        date: '',
        type: 'dir',
        fullpath: entryPath
      }
    }
    this.fetchChildren(this.root)
  }


  reset () {
    this.root.children = []
    return this.fetchChildren(this.root)
  }

  get images() {
    const getImg = (node: TreeNode): FileNodeInfo[] => {
      return node.children
        .map((child) => {
          if (child.info.type === 'dir') {
            return getImg(child)
          }
          if (isMediaFile(child.info.name)) {
            return child.info
          }
        })
        .filter((v) => v)
        .flat(1) as FileNodeInfo[]
    }
    return getImg(this.root)
  }

  get isCompleted() {
    return this.execQueue.length === 0
  }

  private async fetchChildren(par: TreeNode): Promise<TreeNode> {
    // console.log('fetch', par.info.fullpath)
    const { files } = await getTargetFolderFiles(par.info.fullpath)
    par.children = sortFiles(files, this.sortMethod).map((v) => ({
      info: v,
      children: []
    }))
    this.execQueue.shift()
    this.execQueue.unshift(
      ...par.children
        .filter((v) => v.info.type === 'dir')
        .map((v) => ({
          fn: () => this.fetchChildren(v),
          ...v
        }))
    ) // 用队列来实现dfs
    return par
  }
  async next() {
    const pkg = first(this.execQueue)
    if (!pkg) {
      return null
    }
    const res = await pkg.fn() // 这边调用时vue响应式没工作
    this.execQueue = this.execQueue.slice()
    this.root = { ...this.root }
    return res
  }
}
