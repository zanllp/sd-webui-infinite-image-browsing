export function isAbsolute (path: string): boolean {
  return /^(?:\/|[a-z]:)/i.test(normalize(path))
}

export function normalize (path: string): string {
  if (!path) {
    return ''
  }
  // 将路径分隔符替换为斜杠
  path = path.replace(/\\/g, '/')

  // 将多个连续斜杠替换为一个
  path = path.replace(/\/+/g, '/')

  // 处理 .. 和 .
  const parts = path.split('/')
  const newParts = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part === '..') {
      newParts.pop()
    } else if (part !== '' && part !== '.') {
      newParts.push(part)
    }
  }

  // 重新组合路径
  const result = newParts.join('/')

  const startWithSlash = path.startsWith('/')
  if (startWithSlash) {
    return '/' + result
  } else {
    return result
  }
}

export function join (...paths: string[]): string {
  if (!paths.length) {
    return ''
  }
  // 将所有路径组合成一个字符串
  let result = paths.join('/')

  // 规范化路径
  result = normalize(result)
  // 如果原始路径以斜杠结尾，则结果也以斜杠结尾
  const endsWithSlash = paths[paths.length - 1].endsWith('/')
  if (endsWithSlash && !result.endsWith('/')) {
    return result + '/'
  } else {
    return result
  }
}


export const normalizeRelativePathToAbsolute = (relativePath: string, cwd: string) => {
  const absolutePath = isAbsolute(relativePath)
    ? relativePath
    : normalize(join(cwd, relativePath))
  return normalize(absolutePath)
}

export const splitPath = (path: string) => {
  path = normalize(path)
  const frags = path.split('/').filter(v => v)
  if (frags[0].endsWith(':')) {
   frags[0] = frags[0] + '/'// 分割完是c: -> c:/
  }
  return frags
}
