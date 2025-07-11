import type { FileNodeInfo } from '@/api/files'
import { t } from '@/i18n'
import { SearchSelectConv } from 'vue3-ts-util'

export const sortMethodMap = (): Record<SortMethod, string> => ({
  'date-asc': t('sortByDateAscending'),
  'date-desc': t('sortByDateDescending'),
  'name-asc': t('sortByNameAscending'),
  'name-desc': t('sortByNameDescending'),
  'size-asc': t('sortBySizeAscending'),
  'size-desc': t('sortBySizeDescending'),
  'created-time-asc': t('sortByCreatedDateAscending'),
  'created-time-desc': t('sortByCreatedDateDescending'),
  'high-precision-date-asc': t('sortByHighPrecisionDateAscending'),
  'high-precision-date-desc': t('sortByHighPrecisionDateDescending'),
  'high-precision-created-time-asc': t('sortByHighPrecisionCreatedDateAscending'),
  'high-precision-created-time-desc': t('sortByHighPrecisionCreatedDateDescending')
})

export enum SortMethod {
  DATE_ASC = 'date-asc',
  DATE_DESC = 'date-desc',
  NAME_ASC = 'name-asc',
  NAME_DESC = 'name-desc',
  SIZE_ASC = 'size-asc',
  SIZE_DESC = 'size-desc',
  CREATED_TIME_ASC = 'created-time-asc',
  CREATED_TIME_DESC = 'created-time-desc',
  HIGH_PRECISION_DATE_ASC = 'high-precision-date-asc',
  HIGH_PRECISION_DATE_DESC = 'high-precision-date-desc',
  HIGH_PRECISION_CREATED_TIME_ASC = 'high-precision-created-time-asc',
  HIGH_PRECISION_CREATED_TIME_DESC = 'high-precision-created-time-desc'
}

export const sortMethods = Object.values(SortMethod) as SortMethod[]

export const sortMethodConv: SearchSelectConv<SortMethod> = {
  value: (v) => v,
  text: (v) => sortMethodMap()[v].toLocaleLowerCase()
}

type FileList = FileNodeInfo[]

const isValidNumber = (value: any): value is number => 
  typeof value === 'number' && !isNaN(value) && isFinite(value) && value >= 0

const compareByType = (a: FileNodeInfo, b: FileNodeInfo) => {
  const sa = a.type === 'dir' ? 1 : 0
  const sb = b.type === 'dir' ? 1 : 0
  return sb - sa
}

const compareByHighPrecisionDate = (a: FileNodeInfo, b: FileNodeInfo) => {
  // 如果有有效的高精度时间戳，则使用高精度时间戳，否则fallback到低精度时间戳
  if (isValidNumber(a.mtime_ns) && isValidNumber(b.mtime_ns)) {
    return Number(a.mtime_ns - b.mtime_ns)
  }
  console.warn('High precision mtime_ns not available, falling back to date comparison')
  return compareByDate(a, b)
}

const compareByHighPrecisionCreatedDate = (a: FileNodeInfo, b: FileNodeInfo) => {
  // 如果有有效的高精度创建时间戳，则使用高精度时间戳，否则fallback到低精度创建时间
  if (isValidNumber(a.ctime_ns) && isValidNumber(b.ctime_ns)) {
    return Number(a.ctime_ns - b.ctime_ns)
  }
  console.warn('High precision ctime_ns not available, falling back to created_time comparison')
  return compareByCreatedDate(a, b)
}

const compareByDate = (a: FileNodeInfo, b: FileNodeInfo) => {
  const da = Date.parse(a.date)
  const db = Date.parse(b.date)
  return da - db
}

const compareByCreatedDate = (a: FileNodeInfo, b: FileNodeInfo) => {
  const da = Date.parse(a.created_time)
  const db = Date.parse(b.created_time)
  return da - db
}

const compareByName = (a: FileNodeInfo, b: FileNodeInfo) => {
  const an = a.name.toLowerCase()
  const bn = b.name.toLowerCase()
  return an.localeCompare(bn)
}

const compareBySize = (a: FileNodeInfo, b: FileNodeInfo) => {
  return a.bytes - b.bytes
}

export const sortFiles = (files: FileList, method: SortMethod) => {
  const compare = (a: FileNodeInfo, b: FileNodeInfo) => {
    switch (method) {
      case SortMethod.DATE_ASC:
        return compareByDate(a, b)
      case SortMethod.DATE_DESC:
        return compareByDate(b, a)
      case SortMethod.CREATED_TIME_ASC:
        return compareByCreatedDate(a, b)
      case SortMethod.CREATED_TIME_DESC:
        return compareByCreatedDate(b, a)
      case SortMethod.HIGH_PRECISION_DATE_ASC:
        return compareByHighPrecisionDate(a, b)
      case SortMethod.HIGH_PRECISION_DATE_DESC:
        return compareByHighPrecisionDate(b, a)
      case SortMethod.HIGH_PRECISION_CREATED_TIME_ASC:
        return compareByHighPrecisionCreatedDate(a, b)
      case SortMethod.HIGH_PRECISION_CREATED_TIME_DESC:
        return compareByHighPrecisionCreatedDate(b, a)
      case SortMethod.NAME_ASC:
        return compareByName(a, b)
      case SortMethod.NAME_DESC:
        return compareByName(b, a)
      case SortMethod.SIZE_ASC:
        return compareBySize(a, b)
      case SortMethod.SIZE_DESC:
        return compareBySize(b, a)
      default:
        throw new Error(`Invalid sort method: ${method}`)
    }
  }
  return files.slice().sort((a, b) => compareByType(a, b) || compare(a, b))
}
