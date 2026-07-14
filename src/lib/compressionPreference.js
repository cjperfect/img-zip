import { compressionModes } from './compress'

const STORAGE_KEY = 'lanhu-assets.compression-mode'
const validModes = new Set(Object.values(compressionModes))

export function loadCompressionMode() {
  const savedMode = localStorage.getItem(STORAGE_KEY)
  return validModes.has(savedMode) ? savedMode : compressionModes.tinypng
}

export function saveCompressionMode(mode) {
  if (!validModes.has(mode)) return
  localStorage.setItem(STORAGE_KEY, mode)
}
