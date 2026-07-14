import { AnimatePresence, motion } from 'motion/react'

export default function DropOverlay({ activeFolderUrl, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 flex items-center justify-center bg-blue-100/20 p-6 backdrop-blur-lg"
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="drop-overlay flex h-full max-h-[520px] w-full max-w-[780px] flex-col items-center justify-center rounded-[42px] text-center"
          >
            <span className="glass-primary mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] text-5xl font-light">+</span>
            <p className="text-3xl font-semibold tracking-tight text-slate-950">释放以上传图片</p>
            <p className="mt-4 text-base text-slate-500">文件将自动压缩并上传到当前 OBS 目录</p>
            <p className="glass-pill mt-8 rounded-full px-5 py-2 font-mono text-xs text-blue-700">
              {activeFolderUrl || '请先完成连接配置'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
