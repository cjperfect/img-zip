import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const publicAsset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
const obsFolderImage = publicAsset("/obs-folder.png");
const ossFolderImage = publicAsset("/oss-folder.png");

function Field({ description, label, readOnly = false, value, onChange, secret = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      {description && <span className="mb-2 block text-xs leading-5 text-slate-400">{description}</span>}
      <input
        type={secret ? "password" : "text"}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className={`glass-input w-full rounded-xl px-3.5 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-3 focus:ring-blue-100/70 ${
          readOnly ? "cursor-not-allowed text-slate-500 opacity-75" : ""
        }`}
      />
    </label>
  );
}

function ProviderOption({ label, value, current, onChange, description }) {
  const selected = current === value
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`flex flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
        selected
          ? "border-blue-300 bg-blue-50/70 text-blue-800 shadow-sm shadow-blue-500/10"
          : "border-transparent bg-white/40 text-slate-600 hover:bg-white/70 hover:text-slate-800"
      }`}
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
        selected ? "border-blue-500" : "border-slate-300"
      }`}>
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
      </span>
      <span className="flex flex-col">
        <span className="font-medium">{label}</span>
        {description && <span className="mt-0.5 text-xs text-slate-400">{description}</span>}
      </span>
    </button>
  )
}

const PROVIDER_FIELDS = {
  obs: {
    folderLabel: 'OBS 文件夹目录',
    folderDesc: '这里填写当前项目的 OBS 地址，格式 obs://bucket/path/',
    folderPlaceholder: 'obs://你的桶名/目录路径/',
    endpointLabel: 'OBS Endpoint',
    endpointDesc: '华为云 OBS 服务节点地址',
    endpointReadOnly: true,
    guideTitle: '如何获取 OBS 配置',
    title: 'OBS 连接设置',
    description: '填写 OBS 连接信息，成功连接后图片会通过 TinyPNG 自动压缩并上传华为云 OBS。',
  },
  oss: {
    folderLabel: 'OSS 文件夹目录',
    folderDesc: '这里填写当前项目的 OSS 地址，格式 oss://bucket/path/',
    folderPlaceholder: 'oss://你的桶名/目录路径/',
    endpointLabel: 'OSS Region',
    endpointDesc: '阿里云 OSS 地域节点，例如 oss-cn-hangzhou、oss-cn-shanghai',
    endpointReadOnly: false,
    guideTitle: '如何获取 OSS 配置',
    title: 'OSS 连接设置',
    description: '填写 OSS 连接信息，成功连接后图片会通过 TinyPNG 自动压缩并上传阿里云 OSS。',
  },
}

export default function ConfigModal({
  activeFolderUrl,
  config,
  errorMessage,
  folderHistory,
  isLoading,
  isOpen,
  onChange,
  onClearFolderHistory,
  onClose,
  onConnect,
  onDeleteFolderHistoryItem,
}) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const historyRef = useRef(null);
  const fields = PROVIDER_FIELDS[config.provider] || PROVIDER_FIELDS.obs;

  function handleProviderChange(newProvider) {
    if (newProvider === config.provider) return

    const updates = { provider: newProvider }

    // 自动切换 folderUrl 协议前缀
    if (newProvider === 'oss' && config.folderUrl.startsWith('obs://')) {
      updates.folderUrl = config.folderUrl.replace(/^obs:\/\//, 'oss://')
    } else if (newProvider === 'obs' && config.folderUrl.startsWith('oss://')) {
      updates.folderUrl = config.folderUrl.replace(/^oss:\/\//, 'obs://')
    }

    // 自动切换 endpoint
    updates.endpoint = newProvider === 'oss'
      ? 'oss-cn-shenzhen'
      : 'https://obs.cn-south-1.myhuaweicloud.com'

    onChange('provider', updates.provider)
    if (updates.folderUrl !== undefined) onChange('folderUrl', updates.folderUrl)
    onChange('endpoint', updates.endpoint)
  }

  useEffect(() => {
    if (!isHistoryOpen) return undefined;

    function closeHistoryOnOutsideClick(event) {
      if (!historyRef.current?.contains(event.target)) {
        setIsHistoryOpen(false);
      }
    }

    document.addEventListener("click", closeHistoryOnOutsideClick, true);
    return () => document.removeEventListener("click", closeHistoryOnOutsideClick, true);
  }, [isHistoryOpen]);

  function closeModal() {
    setIsGuideOpen(false);
    setIsHistoryOpen(false);
    setPreviewImage(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-20 flex items-center justify-center bg-slate-700/20 px-4 py-6 backdrop-blur-md"
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="连接配置"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 27 }}
            onMouseDown={(event) => event.stopPropagation()}
            className="glass-modal max-h-full w-full max-w-[680px] overflow-y-auto rounded-[28px] p-6 md:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{fields.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{fields.description}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="关闭"
                className="glass-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 transition"
              >
                x
              </button>
            </div>

            {/* 服务商选择 */}
            <div className="mb-5">
              <span className="mb-2 block text-xs font-medium text-slate-500">选择云存储服务商</span>
              <div className="flex gap-3">
                <ProviderOption
                  label="华为云 OBS"
                  value="obs"
                  current={config.provider}
                  onChange={handleProviderChange}
                  description="obs.cn-south-1"
                />
                <ProviderOption
                  label="阿里云 OSS"
                  value="oss"
                  current={config.provider}
                  onChange={handleProviderChange}
                  description="oss-cn-hangzhou"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">{fields.folderLabel} -&gt;</span>
                  <span className="mb-2 block text-xs leading-5 text-slate-400">{fields.folderDesc}</span>
                  <div ref={historyRef} className="relative">
                    <input
                      type="text"
                      aria-label={fields.folderLabel}
                      value={config.folderUrl}
                      placeholder={fields.folderPlaceholder}
                      onChange={(event) => onChange("folderUrl", event.target.value)}
                      className="glass-input w-full rounded-xl py-3 pl-3.5 pr-12 text-sm outline-none transition focus:border-blue-400 focus:ring-3 focus:ring-blue-100/70"
                    />
                    <button
                      type="button"
                      onClick={() => setIsHistoryOpen((current) => !current)}
                      aria-label="显示历史记录"
                      aria-expanded={isHistoryOpen}
                      className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/60 hover:text-blue-600"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3-6.7M3 4.5v5h5" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
                      </svg>
                    </button>
                    <AnimatePresence>
                      {isHistoryOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="glass-modal absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-xl p-2 shadow-xl shadow-slate-900/10"
                        >
                          {folderHistory.length ? (
                            <>
                              <div className="flex items-center justify-between gap-3 px-2 py-1.5">
                                <p className="text-xs font-medium text-slate-500">历史记录</p>
                                <button
                                  type="button"
                                  onClick={onClearFolderHistory}
                                  disabled={!folderHistory.some((folderUrl) => folderUrl !== activeFolderUrl)}
                                  className="rounded-md px-1.5 py-1 text-[11px] font-medium text-rose-500 transition hover:bg-rose-50/80 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  清空其他
                                </button>
                              </div>
                              <div className="pretty-scrollbar max-h-52 overflow-auto">
                                {folderHistory.map((folderUrl) => {
                                  const isActiveFolder = folderUrl === activeFolderUrl
                                  return (
                                  <div
                                    key={folderUrl}
                                    className={`group flex items-center gap-1 rounded-lg border transition ${
                                      isActiveFolder
                                        ? "border-emerald-200/80 bg-emerald-50/80 shadow-sm shadow-emerald-500/5"
                                        : "border-transparent hover:bg-white/60"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onChange("folderUrl", folderUrl);
                                        setIsHistoryOpen(false);
                                      }}
                                      className={`min-w-0 flex-1 truncate px-2 py-2.5 text-left font-mono text-xs transition ${
                                        isActiveFolder ? "font-medium text-emerald-700" : "text-slate-600 group-hover:text-blue-700"
                                      }`}
                                      title={folderUrl}
                                    >
                                      {folderUrl}
                                    </button>
                                    {isActiveFolder ? (
                                      <span className="mr-1 shrink-0 rounded-full bg-emerald-50/80 px-2 py-1 text-[10px] font-medium text-emerald-600">
                                        当前连接
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => onDeleteFolderHistoryItem(folderUrl)}
                                        aria-label={`删除历史记录 ${folderUrl}`}
                                        title="删除"
                                        className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50/80 hover:text-rose-600"
                                      >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                  )
                                })}
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="px-2 py-1.5 text-xs font-medium text-slate-500">历史记录</p>
                              <p className="px-2 py-3 text-xs text-slate-400">暂无历史记录</p>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <Field
                  label={fields.endpointLabel}
                  description={fields.endpointDesc}
                  value={config.endpoint}
                  onChange={(value) => onChange("endpoint", value)}
                  readOnly={fields.endpointReadOnly}
                />
              </div>
              <div className="md:col-span-2">
                <Field
                  label="Access Key ID"
                  value={config.accessKeyId}
                  onChange={(value) => onChange("accessKeyId", value)}
                />
              </div>
              <div className="md:col-span-2">
                <Field
                  label="Secret Access Key"
                  value={config.secretAccessKey}
                  onChange={(value) => onChange("secretAccessKey", value)}
                />
              </div>
            </div>

            {errorMessage && (
              <p className="mt-4 rounded-xl bg-rose-50/75 px-4 py-3 text-sm text-rose-700">{errorMessage}</p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="text-left text-sm font-medium text-blue-600 transition hover:text-blue-800"
              >
                {fields.guideTitle}
              </button>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="glass-button rounded-xl px-5 py-3 text-sm font-medium text-slate-600 transition"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={onConnect}
                  disabled={isLoading}
                  className="glass-primary rounded-xl px-6 py-3 text-sm font-medium transition disabled:cursor-wait disabled:opacity-60"
                >
                  {isLoading ? "正在连接..." : "连接并读取目录"}
                </button>
              </div>
            </div>
          </motion.section>

          <AnimatePresence>
            {isGuideOpen && (
              <motion.aside
                role="dialog"
                aria-modal="true"
                aria-label="如何获取配置"
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 310, damping: 32 }}
                onMouseDown={(event) => event.stopPropagation()}
                className="glass-modal fixed right-0 top-0 z-30 flex h-full w-full max-w-[520px] flex-col overflow-hidden rounded-l-[28px] p-5 shadow-2xl shadow-slate-900/15 md:p-6"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-slate-950">{fields.guideTitle}</h3>
                    <p className="mt-1 text-sm text-slate-500">按下面两项准备连接信息。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGuideOpen(false)}
                    aria-label="关闭配置说明"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-white/60"
                  >
                    x
                  </button>
                </div>
                <div className="pretty-scrollbar min-h-0 flex-1 space-y-6 overflow-auto pr-1">
                  <section>
                    <h4 className="text-sm font-semibold text-slate-900">1. 如何获取{config.provider === 'oss' ? ' OSS ' : ' OBS '}文件夹目录</h4>
                    {config.provider === 'obs' ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ src: obsFolderImage, alt: "OBS 文件夹目录示意图" })}
                        className="mt-3 block w-full rounded-2xl text-left"
                      >
                        <img
                          src={obsFolderImage}
                          alt="OBS 文件夹目录示意图"
                          className="w-full rounded-2xl border border-white/75 bg-white/55 object-contain shadow-sm transition hover:scale-[1.01]"
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ src: ossFolderImage, alt: "OSS 文件夹目录示意图" })}
                        className="mt-3 block w-full rounded-2xl text-left"
                      >
                        <img
                          src={ossFolderImage}
                          alt="OSS 文件夹目录示意图"
                          className="w-full rounded-2xl border border-white/75 bg-white/55 object-contain shadow-sm transition hover:scale-[1.01]"
                        />
                      </button>
                    )}
                  </section>
                  <section>
                    <h4 className="text-sm font-semibold text-slate-900">2. Access Key ID 和 Secret Access Key</h4>
                    <div className="mt-3 flex aspect-[16/9] items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-white/50 text-sm font-medium text-slate-500">
                      内部提供
                    </div>
                  </section>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {previewImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-5 backdrop-blur-sm"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="glass-modal max-h-full w-full max-w-[980px] overflow-hidden rounded-[28px] p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-slate-700">{previewImage.alt}</p>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(null)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-white/60"
                      aria-label="关闭图片预览"
                    >
                      x
                    </button>
                  </div>
                  <div className="pretty-scrollbar max-h-[78vh] overflow-auto rounded-2xl bg-white/45">
                    <img
                      src={previewImage.src}
                      alt={previewImage.alt}
                      className="mx-auto h-auto w-full object-contain"
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
