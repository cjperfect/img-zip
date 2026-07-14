const STORAGE_KEY = 'lanhu-assets.obs-folder-history.v1'
const MAX_HISTORY_ITEMS = 10

export function loadFolderHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(history) ? history.filter((item) => typeof item === 'string') : []
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

export function saveFolderToHistory(folderUrl) {
  const normalizedUrl = folderUrl.trim()
  if (!normalizedUrl) return loadFolderHistory()

  const history = [
    normalizedUrl,
    ...loadFolderHistory().filter((item) => item !== normalizedUrl),
  ].slice(0, MAX_HISTORY_ITEMS)

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  return history
}

export function removeFolderFromHistory(folderUrl) {
  const history = loadFolderHistory().filter((item) => item !== folderUrl)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  return history
}

export function clearFolderHistory(preservedFolderUrl = '') {
  localStorage.removeItem(STORAGE_KEY)
  return preservedFolderUrl ? saveFolderToHistory(preservedFolderUrl) : []
}
