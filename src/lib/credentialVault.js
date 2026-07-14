const STORAGE_KEY = 'lanhu-assets.credentials.v4'
const LEGACY_STORAGE_KEYS = ['lanhu-assets.credentials.v3', 'lanhu-assets.credentials.v2']
const CIPHER_KEY = 'obs-imageflow-credential-vault'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToBase64(bytes) {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return window.btoa(binary)
}

function base64ToBytes(value) {
  return Uint8Array.from(window.atob(value), (character) => character.charCodeAt(0))
}

function hashText(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function nextByte(state) {
  state.value ^= state.value << 13
  state.value ^= state.value >>> 17
  state.value ^= state.value << 5
  return state.value & 255
}

function transformText(value, salt) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value
  const state = { value: hashText(`${CIPHER_KEY}:${salt}`) || 1 }
  return bytes.map((byte) => byte ^ nextByte(state))
}

function createSalt() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function encryptText(value, salt) {
  return bytesToBase64(transformText(value || '', salt))
}

function decryptText(value, salt) {
  return decoder.decode(transformText(base64ToBytes(value || ''), salt))
}

function removeLegacyCredentials() {
  LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
}

export async function saveCredentials(credentials) {
  const salt = createSalt()
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 4,
      folderUrl: credentials.folderUrl,
      endpoint: credentials.endpoint,
      salt,
      accessKeyId: encryptText(credentials.accessKeyId, salt),
      secretAccessKey: encryptText(credentials.secretAccessKey, salt),
    }),
  )
  removeLegacyCredentials()
}

export async function loadCredentials() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const vault = JSON.parse(raw)
      return {
        folderUrl: vault.folderUrl || '',
        endpoint: vault.endpoint || '',
        accessKeyId: decryptText(vault.accessKeyId, vault.salt),
        secretAccessKey: decryptText(vault.secretAccessKey, vault.salt),
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
  }

  const legacyRaw = LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean)
  if (!legacyRaw) return null

  try {
    const legacyVault = JSON.parse(legacyRaw)
    return legacyVault.credentials || null
  } catch {
    removeLegacyCredentials()
    return null
  }
}
