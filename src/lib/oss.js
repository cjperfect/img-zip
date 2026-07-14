import { registerProxyEndpoint } from './proxy'

export function parseOssFolder(folderUrl) {
  const match = /^oss:\/\/([^/]+)\/?(.*)$/.exec(folderUrl.trim())
  if (!match) {
    throw new Error('OSS 目录格式应为 oss://bucket/path/')
  }

  const prefix = match[2] ? `${match[2].replace(/^\/+|\/+$/g, '')}/` : ''
  return { bucket: match[1], prefix }
}

export async function createOssClient(config) {
  const OSS = (await import('ali-oss')).default
  const { bucket } = parseOssFolder(config.folderUrl)
  const region = config.endpoint.trim()

  const client = new OSS({
    accessKeyId: config.accessKeyId.trim(),
    accessKeySecret: config.secretAccessKey.trim(),
    bucket,
    region,
    secure: true,
  })

  // 开发环境：拦截 SDK 的 XHR 请求，通过 Vite 代理转发绕过跨域限制
  if (import.meta.env.DEV) {
    registerProxyEndpoint({
      protocol: 'https:',
      hostname: 'aliyuncs.com',
      proxyPrefix: '/api/oss-proxy/',
    })
  }

  return client
}

/**
 * 归一化为与 OBS 相同的 { Key, Size, LastModified } 格式
 */
export async function listObjects(client, _bucket, prefix) {
  const contents = []
  let marker

  do {
    const result = await client.list({
      prefix,
      marker,
      'max-keys': 1000,
    })
    const objects = (result.objects || []).map((item) => ({
      Key: item.name,
      Size: item.size,
      LastModified: item.lastModified instanceof Date ? item.lastModified.toISOString() : item.lastModified,
    }))
    contents.push(...objects)
    marker = result.nextMarker
  } while (marker)

  return contents.filter((item) => item.Key !== prefix)
}

export async function uploadObject(client, _bucket, key, blob) {
  await client.put(key, blob, { mime: blob.type })
}

export async function renameObject(client, _bucket, oldKey, newKey) {
  await client.copy(newKey, oldKey)
  await client.delete(oldKey)
}

export async function deleteObject(client, _bucket, key) {
  await client.delete(key)
}

export function buildObjectLinks(config, bucket, key) {
  const region = config.endpoint.trim()
  const encodedKey = key.split('/').map(encodeURIComponent).join('/')
  return {
    obsUrl: `oss://${bucket}/${key}`,
    httpsUrl: `https://${bucket}.${region}.aliyuncs.com/${encodedKey}`,
  }
}
