import { formatBytes } from '../utils/format'

function StatCard({ label, value, detail, accent = false }) {
  return (
    <div className={`rounded-2xl p-4 md:p-5 ${accent ? 'glass-accent text-white' : 'glass-panel'}`}>
      <p className={`text-xs font-medium ${accent ? 'text-blue-50' : 'text-slate-500'}`}>{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className={`mt-1 text-xs ${accent ? 'text-blue-100' : 'text-slate-400'}`}>{detail}</p>
    </div>
  )
}

export default function StatsGrid({ connected, objectCount, queueCount, successfulUploads, savedBytes }) {
  return (
    <section className="grid grid-cols-2 gap-3">
      <StatCard label="目录文件" value={connected ? String(objectCount) : '--'} detail="当前对象数量" />
      <StatCard label="上传队列" value={String(queueCount)} detail="本次选择文件" />
      <StatCard label="完成上传" value={String(successfulUploads)} detail="已获得地址" accent />
      <StatCard label="节省体积" value={formatBytes(savedBytes)} detail="本次压缩结果" />
    </section>
  )
}
