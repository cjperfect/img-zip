import { AnimatePresence, motion } from 'motion/react'

export default function NoticeBanner({ connected, notice }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={notice || 'empty'}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="glass-inset rounded-2xl px-4 py-3 text-sm text-slate-500"
      >
        {notice || (connected ? '已准备好上传素材' : '打开连接设置以开始使用')}
      </motion.div>
    </AnimatePresence>
  )
}
