import { registerProxyEndpoint } from './proxy'

export function parseObsFolder(folderUrl) {
  const match = /^obs:\/\/([^/]+)\/?(.*)$/.exec(folderUrl.trim())
  if (!match) {
    throw new Error('OBS 目录格式应为 obs://bucket/path/')
  }

  const prefix = match[2] ? `${match[2].replace(/^\/+|\/+$/g, '')}/` : ''
  return { bucket: match[1], prefix }
}

export async function createObsClient(config) {
  const { default: ObsClient } = await import('esdk-obs-browserjs')
  const client = new ObsClient({
    access_key_id: config.accessKeyId.trim(),
    secret_access_key: config.secretAccessKey.trim(),
    server: config.endpoint.trim(),
    path_style: false,
  })

  // 开发环境：通过共享代理拦截 SDK 的 XHR 请求绕过跨域限制
  if (import.meta.env.DEV) {
    const parsed = new URL(config.endpoint.trim())
    registerProxyEndpoint({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      proxyPrefix: '/api/obs-proxy/',
    })
  }

  return client
}

function request(client, method, params) {
  return new Promise((resolve, reject) => {
    client[method](params, (error, result) => {
      if (error) {
        reject(error)
        return
      }
      if (!result || result.CommonMsg?.Status >= 300) {
        reject(new Error(result?.CommonMsg?.Message || `OBS ${method} 请求失败`))
        return
      }
      resolve(result.InterfaceResult || {})
    })
  })
}

export async function listObjects(client, bucket, prefix) {
  const contents = []
  let marker

  do {
    const result = await request(client, 'listObjects', {
      Bucket: bucket,
      Prefix: prefix,
      Marker: marker,
      MaxKeys: 1000,
    })
    contents.push(...(result.Contents || []))
    marker = result.IsTruncated === 'true' ? result.NextMarker : undefined
  } while (marker)

  return contents.filter((item) => item.Key !== prefix)
}

export async function uploadObject(client, bucket, key, blob) {
  return request(client, 'putObject', {
    Bucket: bucket,
    Key: key,
    SourceFile: blob,
    ContentType: blob.type,
  })
}

export async function renameObject(client, bucket, oldKey, newKey) {
  await request(client, 'copyObject', {
    Bucket: bucket,
    Key: newKey,
    CopySource: `${bucket}/${oldKey}`,
  })
  await request(client, 'deleteObject', {
    Bucket: bucket,
    Key: oldKey,
  })
}

export async function deleteObject(client, bucket, key) {
  return request(client, 'deleteObject', {
    Bucket: bucket,
    Key: key,
  })
}

export function buildObjectLinks(endpoint, bucket, key) {
  const url = new URL(endpoint.trim())
  const encodedKey = key.split('/').map(encodeURIComponent).join('/')
  return {
    obsUrl: `obs://${bucket}/${key}`,
    httpsUrl: `${url.protocol}//${bucket}.${url.host}/${encodedKey}`,
  }
}
