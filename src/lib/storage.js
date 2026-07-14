import * as obs from './obs'
import * as oss from './oss'

function selectProvider(config) {
  return config.provider === 'oss' ? oss : obs
}

// ---- 目录解析 ----

export function parseFolderUrl(config) {
  if (config.provider === 'oss') return oss.parseOssFolder(config.folderUrl)
  return obs.parseObsFolder(config.folderUrl)
}

// ---- 客户端创建 ----

export async function createClient(config) {
  if (config.provider === 'oss') return oss.createOssClient(config)
  return obs.createObsClient(config)
}

// ---- 存储操作 ----

export async function listObjects(client, config, bucket, prefix) {
  return selectProvider(config).listObjects(client, bucket, prefix)
}

export async function uploadObject(client, config, bucket, key, blob) {
  return selectProvider(config).uploadObject(client, bucket, key, blob)
}

export async function renameObject(client, config, bucket, oldKey, newKey) {
  return selectProvider(config).renameObject(client, bucket, oldKey, newKey)
}

export async function deleteObject(client, config, bucket, key) {
  return selectProvider(config).deleteObject(client, bucket, key)
}

export function buildObjectLinks(config, bucket, key) {
  if (config.provider === 'oss') return oss.buildObjectLinks(config, bucket, key)
  return obs.buildObjectLinks(config.endpoint, bucket, key)
}
