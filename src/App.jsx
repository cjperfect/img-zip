import { useEffect, useRef, useState } from 'react'
import AppHeader from './components/AppHeader'
import ConfigModal from './components/ConfigModal'
import DropOverlay from './components/DropOverlay'
import NoticeBanner from './components/NoticeBanner'
import ObjectTable from './components/ObjectTable'
import StatsGrid from './components/StatsGrid'
import Toast from './components/Toast'
import UploadQueue from './components/UploadQueue'
import { loadCredentials, saveCredentials } from './lib/credentialVault'
import { loadCompressionMode, saveCompressionMode } from './lib/compressionPreference'
import { clearFolderHistory, loadFolderHistory, removeFolderFromHistory, saveFolderToHistory } from './lib/folderHistory'
import { loadNamingPrefix, loadNamingStartIndex, saveNamingPrefix, saveNamingStartIndex } from './lib/namingPreference'
import { buildObjectLinks, createObsClient, deleteObject, listObjects, parseObsFolder, renameObject, uploadObject } from './lib/obs'
import { compressImage } from './lib/compress'
import { copyToClipboard } from './utils/clipboard'
import { createId } from './utils/id'

const MAX_PARALLEL_UPLOADS = 3

const initialConfig = {
  folderUrl: import.meta.env.VITE_DEFAULT_OBS_FOLDER || 'obs://breo-obs/mini-programs/activity/testFolder/',
  endpoint: import.meta.env.VITE_OBS_ENDPOINT || 'https://obs.cn-south-1.myhuaweicloud.com',
  accessKeyId: '',
  secretAccessKey: '',
}

function App() {
  const [config, setConfig] = useState(initialConfig)
  const [activeFolderUrl, setActiveFolderUrl] = useState('')
  const [objects, setObjects] = useState([])
  const [queue, setQueue] = useState([])
  const [notice, setNotice] = useState('正在恢复上次连接...')
  const [configError, setConfigError] = useState('')
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [connected, setConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [renamingKey, setRenamingKey] = useState('')
  const [deletingKey, setDeletingKey] = useState('')
  const [isFileDragging, setIsFileDragging] = useState(false)
  const [copiedText, setCopiedText] = useState('')
  const [compressionMode, setCompressionMode] = useState(() => loadCompressionMode())
  const [folderHistory, setFolderHistory] = useState(() => loadFolderHistory())
  const [namingPrefix, setNamingPrefix] = useState(() => loadNamingPrefix())
  const [namingStartIndex, setNamingStartIndex] = useState(() => loadNamingStartIndex())
  const [toast, setToast] = useState(null)
  const clientRef = useRef(null)
  const folderRef = useRef(null)
  const activeConfigRef = useRef(null)
  const dragDepthRef = useRef(0)
  const copiedTimerRef = useRef(null)
  const toastTimerRef = useRef(null)
  const activeUploadBatchesRef = useRef(0)

  useEffect(() => {
    let mounted = true
    async function restoreConnection() {
      try {
        const saved = await loadCredentials()
        if (!mounted) return
        if (!saved) {
          setNotice('')
          setIsConfigOpen(true)
          return
        }

        const restoredConfig = { ...initialConfig, ...saved }
        setConfig(restoredConfig)
        const folder = parseObsFolder(restoredConfig.folderUrl)
        const client = await createObsClient(restoredConfig)
        const items = await listObjects(client, folder.bucket, folder.prefix)
        if (!mounted) return

        clientRef.current = client
        folderRef.current = folder
        activeConfigRef.current = restoredConfig
        setConnected(true)
        setActiveFolderUrl(restoredConfig.folderUrl.trim())
        setFolderHistory(saveFolderToHistory(restoredConfig.folderUrl))
        setObjects(items.map((item) => ({ ...item, ...buildObjectLinks(restoredConfig.endpoint, folder.bucket, item.Key) })))
        setNotice(`已自动连接 ${folder.bucket}，读取到 ${items.length} 个文件`)
      } catch (error) {
        if (!mounted) return
        const message = error.message || '自动连接失败，请重新填写连接设置'
        setConfigError(message)
        setNotice(message)
        setIsConfigOpen(true)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    restoreConnection()
    function closeOnEscape(event) {
      if (event.key === 'Escape') setIsConfigOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      mounted = false
      clearTimeout(copiedTimerRef.current)
      clearTimeout(toastTimerRef.current)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const successfulUploads = queue.filter((item) => item.status === 'success').length
  const savedBytes = queue.reduce((total, item) => total + Math.max(0, (item.originalSize || 0) - (item.compressedSize || 0)), 0)
  function updateConfig(field, value) {
    setConfig((current) => ({ ...current, [field]: value }))
  }

  function updateCompressionMode(mode) {
    setCompressionMode(mode)
    saveCompressionMode(mode)
  }

  function updateNamingPrefix(prefix) {
    setNamingPrefix(prefix)
    saveNamingPrefix(prefix)
  }

  function updateNamingStartIndex(index) {
    setNamingStartIndex(index)
    saveNamingStartIndex(index)
  }

  function deleteFolderHistoryItem(folderUrl) {
    if (folderUrl === activeFolderUrl) return
    setFolderHistory(removeFolderFromHistory(folderUrl))
  }

  function deleteAllFolderHistory() {
    setFolderHistory(clearFolderHistory(activeFolderUrl))
  }

  async function connectAndList() {
    setIsLoading(true)
    setNotice('')
    setConfigError('')
    try {
      if (!config.accessKeyId || !config.secretAccessKey) {
        throw new Error('请填写 OBS Access Key ID 与 Secret Access Key')
      }
      const folder = parseObsFolder(config.folderUrl)
      const client = await createObsClient(config)
      const items = await listObjects(client, folder.bucket, folder.prefix)
      clientRef.current = client
      folderRef.current = folder
      activeConfigRef.current = { ...config }
      setConnected(true)
      setActiveFolderUrl(config.folderUrl.trim())
      setFolderHistory(saveFolderToHistory(config.folderUrl))
      setObjects(items.map((item) => ({ ...item, ...buildObjectLinks(config.endpoint, folder.bucket, item.Key) })))
      await saveCredentials({
        folderUrl: config.folderUrl,
        endpoint: config.endpoint,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      })
      setNotice(`已连接 ${folder.bucket}，读取到 ${items.length} 个文件，凭据已保存`)
      setIsConfigOpen(false)
    } catch (error) {
      const message = error.message || '连接 OBS 失败，请检查配置与跨域设置'
      setNotice(message)
      setConfigError(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function refreshObjects() {
    if (!clientRef.current || !folderRef.current || !activeConfigRef.current) return
    setIsLoading(true)
    try {
      const items = await listObjects(clientRef.current, folderRef.current.bucket, folderRef.current.prefix)
      setObjects(items.map((item) => ({ ...item, ...buildObjectLinks(activeConfigRef.current.endpoint, folderRef.current.bucket, item.Key) })))
      setNotice(`目录已刷新，共 ${items.length} 个文件`)
    } catch (error) {
      setNotice(error.message || '刷新目录失败')
    } finally {
      setIsLoading(false)
    }
  }

  function addFiles(fileList) {
    if (!connected) {
      setNotice('请先完成连接配置，再选择需要上传的图片')
      setIsConfigOpen(true)
      return
    }
    const incoming = [...fileList].filter((file) => file.type.startsWith('image/'))
    const entries = incoming.map((file, i) => {
      const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
      const name = namingPrefix
        ? `${namingPrefix}${namingStartIndex + queue.length + i}${ext}`
        : file.name
      return {
        id: createId(),
        file,
        name,
        originalSize: file.size,
        previewUrl: URL.createObjectURL(file),
        compressionMode,
        status: 'queued',
      }
    })
    setQueue((current) => [...current, ...entries])
    if (entries.length) {
      setNotice(`已加入 ${entries.length} 张图片，开始压缩上传`)
      uploadItems(entries)
    }
  }

  function patchItem(id, patch) {
    setQueue((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  async function processUploadItem(item) {
    try {
      patchItem(item.id, { status: 'compressing', error: '' })
      const compressed = await compressImage(item.file, item.compressionMode)
      patchItem(item.id, { status: 'uploading', ...compressed })

      const key = `${folderRef.current.prefix}${item.name}`
      await uploadObject(clientRef.current, folderRef.current.bucket, key, compressed.blob)
      const links = buildObjectLinks(activeConfigRef.current.endpoint, folderRef.current.bucket, key)
      patchItem(item.id, { status: 'success', key, ...links })
      setObjects((current) => [
        { Key: key, Size: compressed.compressedSize, LastModified: new Date().toISOString(), ...links },
        ...current.filter((object) => object.Key !== key),
      ])
    } catch (error) {
      patchItem(item.id, { status: 'error', error: error.message || '处理失败' })
    }
  }

  function containsFiles(event) {
    return [...event.dataTransfer.types].includes('Files')
  }

  function handleDragEnter(event) {
    if (!containsFiles(event)) return
    event.preventDefault()
    dragDepthRef.current += 1
    setIsFileDragging(true)
  }

  function handleDragOver(event) {
    if (!containsFiles(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  function handleDragLeave(event) {
    if (!containsFiles(event)) return
    event.preventDefault()
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0
      setIsFileDragging(false)
    }
  }

  function handleDrop(event) {
    if (!containsFiles(event)) return
    event.preventDefault()
    dragDepthRef.current = 0
    setIsFileDragging(false)
    addFiles(event.dataTransfer.files)
  }

  async function uploadItems(itemsToUpload) {
    if (!itemsToUpload.length) return

    activeUploadBatchesRef.current += 1
    setIsUploading(true)
    let nextIndex = 0
    const workerCount = Math.min(MAX_PARALLEL_UPLOADS, itemsToUpload.length)
    const workers = Array.from({ length: workerCount }, async () => {
      while (nextIndex < itemsToUpload.length) {
        const item = itemsToUpload[nextIndex]
        nextIndex += 1
        await processUploadItem(item)
      }
    })

    try {
      await Promise.all(workers)
      setNotice('批量任务已处理完成，可在文件表格中复制地址')
    } finally {
      activeUploadBatchesRef.current -= 1
      if (activeUploadBatchesRef.current <= 0) {
        activeUploadBatchesRef.current = 0
        setIsUploading(false)
      }
    }
  }

  async function copyText(text) {
    try {
      copyToClipboard(text)
      setCopiedText(text)
      clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopiedText(''), 1600)
      setToast({ id: createId(), message: '已复制到剪贴板' })
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setToast(null), 1800)
    } catch (error) {
      setToast({ id: createId(), message: error.message || '复制失败，请手动复制' })
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setToast(null), 2200)
    }
  }

  async function renameFile(object, nextName) {
    if (!clientRef.current || !folderRef.current || !activeConfigRef.current) {
      throw new Error('请先连接 OBS 目录')
    }

    const cleanName = nextName.trim()
    if (!cleanName) throw new Error('名称不能为空')
    if (/[\\/]/.test(cleanName)) throw new Error('名称不能包含路径分隔符')

    const currentName = object.Key.split('/').filter(Boolean).pop() || object.Key
    if (cleanName === currentName) return

    const prefix = object.Key.includes('/') ? object.Key.slice(0, object.Key.lastIndexOf('/') + 1) : ''
    const nextKey = `${prefix}${cleanName}`
    if (objects.some((item) => item.Key === nextKey)) {
      throw new Error('同名文件已存在')
    }

    setRenamingKey(object.Key)
    try {
      await renameObject(clientRef.current, folderRef.current.bucket, object.Key, nextKey)
      const links = buildObjectLinks(activeConfigRef.current.endpoint, folderRef.current.bucket, nextKey)
      setObjects((current) => current.map((item) => (
        item.Key === object.Key
          ? { ...item, Key: nextKey, LastModified: new Date().toISOString(), ...links }
          : item
      )))
      setToast({ id: createId(), message: '名称已更新' })
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setToast(null), 1800)
    } finally {
      setRenamingKey('')
    }
  }

  async function deleteFile(object) {
    if (!clientRef.current || !folderRef.current) {
      throw new Error('请先连接 OBS 目录')
    }

    setDeletingKey(object.Key)
    try {
      await deleteObject(clientRef.current, folderRef.current.bucket, object.Key)
      setObjects((current) => current.filter((item) => item.Key !== object.Key))
      setToast({ id: createId(), message: '文件已删除' })
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setToast(null), 1800)
    } catch (error) {
      setToast({ id: createId(), message: error.message || '删除失败' })
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setToast(null), 2200)
    } finally {
      setDeletingKey('')
    }
  }

  return (
    <main
      className="liquid-stage min-h-screen text-slate-800 lg:h-screen lg:overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="liquid-orb left-[2%] top-[8%] h-[360px] w-[360px] bg-cyan-300/50" />
      <div className="liquid-orb right-[3%] top-[20%] h-[430px] w-[430px] bg-violet-300/45" />
      <div className="liquid-orb bottom-[-8%] left-[35%] h-[470px] w-[470px] bg-blue-300/40" />
      <div className="relative mx-auto flex w-full max-w-[1900px] flex-col px-3 py-3 md:px-5 md:py-4 lg:h-full">
        <AppHeader activeFolderUrl={activeFolderUrl} connected={connected} onOpenConfig={() => setIsConfigOpen(true)} />

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col gap-4 lg:overflow-hidden">
            <StatsGrid
              connected={connected}
              objectCount={objects.length}
              queueCount={queue.length}
              savedBytes={savedBytes}
              successfulUploads={successfulUploads}
            />
            <NoticeBanner connected={connected} notice={notice} />
            <UploadQueue
              items={queue}
              copiedText={copiedText}
              isUploading={isUploading}
              compressionMode={compressionMode}
              namingPrefix={namingPrefix}
              namingStartIndex={namingStartIndex}
              onCopy={copyText}
              onCompressionModeChange={updateCompressionMode}
              onNamingPrefixChange={updateNamingPrefix}
              onNamingStartIndexChange={updateNamingStartIndex}
              onSelectFiles={addFiles}
            />
          </aside>

          <ObjectTable
            objects={objects}
            copiedText={copiedText}
            connected={connected}
            isLoading={isLoading}
            deletingKey={deletingKey}
            renamingKey={renamingKey}
            onDelete={deleteFile}
            onCopy={copyText}
            onRefresh={refreshObjects}
            onRename={renameFile}
          />
        </div>
      </div>

      <ConfigModal
        activeFolderUrl={activeFolderUrl}
        config={config}
        isLoading={isLoading}
        isOpen={isConfigOpen}
        errorMessage={configError}
        folderHistory={folderHistory}
        onChange={updateConfig}
        onClearFolderHistory={deleteAllFolderHistory}
        onClose={() => setIsConfigOpen(false)}
        onConnect={connectAndList}
        onDeleteFolderHistoryItem={deleteFolderHistoryItem}
      />
      <DropOverlay activeFolderUrl={activeFolderUrl} visible={isFileDragging} />
      <Toast toast={toast} />
    </main>
  )
}

export default App
