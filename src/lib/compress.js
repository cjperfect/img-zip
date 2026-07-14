import { compressImage as compressWithTinyPng } from './tinify'

export const compressionModes = {
  tinypng: 'tinypng',
}

export async function compressImage(file, mode) {
  if (mode === compressionModes.tinypng) {
    return compressWithTinyPng(file)
  }

  throw new Error('未知压缩方式')
}
