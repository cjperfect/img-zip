function GuideStep({ number, text }) {
  return (
    <span className="glass-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600/10 font-semibold text-blue-700">{number}</span>
      {text}
    </span>
  )
}

export default function AppHeader({ activeFolderUrl, connected, onOpenConfig }) {
  return (
    <nav className="glass-panel mb-4 flex flex-col gap-4 rounded-[22px] px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:gap-7">
        <div className="flex items-center gap-3">
          <span className="glass-highlight flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-blue-700">O</span>
          <div>
            <p className="font-semibold tracking-tight text-slate-950">OBS ImageFlow</p>
            <p className="text-xs text-slate-500">图片自动压缩并上传 OBS</p>
          </div>
        </div>
        <div className="hidden h-10 w-px bg-white/70 lg:block" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">图片自动压缩并上传 OBS，生成可直接复制的图片链接</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <GuideStep number="1" text="连接目录" />
            <GuideStep number="2" text="拖入图片" />
            <GuideStep number="3" text="复制地址" />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3 xl:justify-end">
        <div className="glass-inset hidden max-w-[440px] rounded-xl px-4 py-2 sm:block">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Active folder</p>
          <p className="mt-0.5 truncate font-mono text-xs text-blue-700">{activeFolderUrl || '请先配置 OBS 目标目录'}</p>
        </div>
        <span className={`glass-pill flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${connected ? 'text-emerald-700' : 'text-slate-600'}`}>
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {connected ? 'OBS 已连接' : '尚未连接'}
        </span>
        <button type="button" onClick={onOpenConfig} className="glass-primary rounded-xl px-5 py-2.5 text-sm font-medium transition">
          连接设置
        </button>
      </div>
    </nav>
  )
}
