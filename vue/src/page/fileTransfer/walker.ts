import { FileNodeInfo, getTargetFolderFiles } from '@/api/files'
import { first } from 'lodash-es'
import { SortMethod, sortFiles } from './fileSort'
import { isImageFile } from '@/util'

interface TreeNode {
  children: TreeNode[]
  info: FileNodeInfo
}

export class Walker {
  root: TreeNode
  fnQueue: (() => Promise<TreeNode>)[] = []
  constructor(entryPath: string, private sortMethod: SortMethod) {
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

  get images() {
    const getImg = (node: TreeNode): FileNodeInfo[] => {
      return node.children
        .map((child) => {
          if (child.info.type === 'dir') {
            return getImg(child)
          }
          if (isImageFile(child.info.name)) {
            return child.info
          }
        })
        .filter((v) => v)
        .flat(1) as FileNodeInfo[]
    }
    return getImg(this.root)
  }

  private async fetchChildren(par: TreeNode): Promise<TreeNode> {
    const { files } = await getTargetFolderFiles(par.info.fullpath)
    par.children = sortFiles(files, this.sortMethod).map((v) => ({
      info: v,
      children: []
    }))
    this.fnQueue.unshift(
      ...par.children.filter((v) => v.info.type === 'dir').map((v) => () => this.fetchChildren(v))
    ) // 用队列来实现dfs
    return par
  }

  async next() {
    const fn = first(this.fnQueue)!
    const res = await fn()
    this.fnQueue.shift()
    return res
  }
}
