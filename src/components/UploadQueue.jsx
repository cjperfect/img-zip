import { useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { compressionModes } from '../lib/compress'
import { formatBytes } from '../utils/format'

const statusLabels = {
  queued: '等待上传',
  compressing: '压缩中',
  uploading: '上传中',
  success: '已上传',
  error: '失败',
}

const modeOptions = [
  { label: 'TinyPNG 压缩', value: compressionModes.tinypng },
]

function StatusPill({ status }) {
  const style = {
    queued: 'bg-slate-200 text-slate-600',
    compressing: 'bg-amber-100 text-amber-700',
    uploading: 'bg-blue-100 text-blue-700',
    success: 'bg-emerald-100 text-emerald-700',
    error: 'bg-rose-100 text-rose-700',
  }[status]

  return (
    <motion.span
      layout
      animate={status === 'success' ? { scale: [1, 1.1, 1] } : {}}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${style}`}
    >
      {statusLabels[status]}
    </motion.span>
  )
}

function CompressionModeGroup({ compressionMode, disabled, onChange }) {
  return (
    <fieldset
      className="glass-inset flex flex-wrap gap-4 rounded-xl px-3 py-2"
      role="radiogroup"
      aria-label="压缩方式"
      disabled={disabled}
    >
      <legend className="sr-only">压缩方式</legend>
      {modeOptions.map((option) => (
        <label
          key={option.value}
          className={`inline-flex cursor-pointer items-center gap-2 text-xs font-medium transition ${
            compressionMode === option.value ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700'
          } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
        >
          <input
            type="radio"
            name="compression-mode"
            value={option.value}
            checked={compressionMode === option.value}
            onChange={() => onChange(option.value)}
            className="h-3.5 w-3.5 accent-blue-600"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}

function QueueItem({ copiedText, item, onCopy }) {
  const modeLabel = modeOptions.find((option) => option.value === item.compressionMode)?.label

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border px-4 py-3 ${
        item.status === 'success' ? 'border-emerald-200/70 bg-emerald-50/50' : 'border-white/60 bg-white/28'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="preview-trigger relative min-w-0">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {formatBytes(item.originalSize)}
            {item.compressedSize ? ` -> ${formatBytes(item.compressedSize)}` : ''}
          </p>
          {modeLabel && <p className="mt-1 text-[11px] text-slate-400">{modeLabel}</p>}
          {item.previewUrl && (
            <div className="preview-popover pointer-events-none absolute left-0 top-full z-20 mt-2 w-[200px] overflow-hidden rounded-xl border border-white/80 bg-white/90 p-2 opacity-0 shadow-xl shadow-slate-900/10 backdrop-blur transition">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                <img src={item.previewUrl} alt={item.name} className="h-full w-full object-contain" />
              </div>
              <p className="mt-2 truncate px-1 text-xs font-medium text-slate-700">{item.name}</p>
            </div>
          )}
        </div>
        <StatusPill status={item.status} />
      </div>
      {item.error && <p className="mt-2 text-xs text-rose-600">{item.error}</p>}
      {item.obsUrl && (
        <button
          type="button"
          onClick={() => onCopy(item.httpsUrl)}
          className={`glass-inset mt-3 flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left font-mono text-xs transition ${
            copiedText === item.httpsUrl ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700' : 'text-blue-600 hover:bg-white/55'
          }`}
        >
          <span className="min-w-0 truncate">{item.httpsUrl}</span>
          <span className="shrink-0 font-sans text-[11px] font-semibold">{copiedText === item.httpsUrl ? '已复制' : '复制'}</span>
        </button>
      )}
    </motion.div>
  )
}

export default function UploadQueue({
  items,
  copiedText,
  compressionMode,
  namingPrefix,
  namingStartIndex,
  isUploading,
  onCompressionModeChange,
  onNamingPrefixChange,
  onNamingStartIndexChange,
  onCopy,
  onSelectFiles,
}) {
  const fileInputRef = useRef(null)

  function handleFilesSelected(event) {
    if (event.target.files?.length) {
      onSelectFiles(event.target.files)
    }
    event.target.value = ''
  }

  return (
    <div className="glass-panel flex min-h-[260px] flex-col rounded-[28px] p-5 lg:min-h-0 lg:flex-1">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">处理队列</h2>
            <p className="mt-1 text-xs text-slate-400">选择压缩方式后批量上传图片</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="glass-primary rounded-lg px-3 py-1.5 text-xs font-medium transition"
            >
              选择图片
            </button>
            <span className="glass-pill rounded-full px-3 py-1 text-xs text-slate-500">{items.length}</span>
            {isUploading && <span className="glass-pill rounded-full px-3 py-1 text-xs text-blue-600">处理中</span>}
          </div>
        </div>
        <CompressionModeGroup
          compressionMode={compressionMode}
          disabled={isUploading}
          onChange={onCompressionModeChange}
        />
        <div className="glass-inset flex items-center gap-2 rounded-xl px-3 py-2">
          <label htmlFor="naming-prefix" className="shrink-0 text-xs font-medium text-slate-500">
            命名前缀
          </label>
          <input
            id="naming-prefix"
            type="text"
            value={namingPrefix}
            onChange={(e) => onNamingPrefixChange(e.target.value)}
            placeholder="请输入命名前缀"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
          <span className="text-xs text-slate-400">索引从</span>
          <input
            id="naming-start-index"
            type="number"
            min="1"
            value={namingStartIndex}
            onChange={(e) => onNamingStartIndexChange(parseInt(e.target.value, 10) || 1)}
            className="w-14 bg-transparent text-center text-[11px] text-emerald-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-xs text-slate-400">开始</span>
        </div>
        {namingPrefix && (
          <p className="text-[11px] text-slate-400">
            自动命名已启用，文件将命名为 <span className="font-medium text-slate-600">{namingPrefix}{namingStartIndex}</span>、<span className="font-medium text-slate-600">{namingPrefix}{namingStartIndex + 1}</span>... 索引依次递增
          </p>
        )}
      </div>
      {items.length ? (
        <div className="pretty-scrollbar h-full space-y-3 overflow-auto pr-1">
          <AnimatePresence initial={false}>
            {[...items].reverse().map((item) => (
              <QueueItem key={item.id} copiedText={copiedText} item={item} onCopy={onCopy} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="glass-inset flex flex-1 flex-col items-center justify-center rounded-2xl px-6 text-center">
          <p className="text-sm font-medium text-slate-600">暂无处理任务</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">点击选择图片或将多张图片拖入页面</p>
        </div>
      )}
    </div>
  )
}
