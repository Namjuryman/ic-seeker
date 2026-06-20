export default function JournalIngestionPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <section className="hero-panel">
        <div>
          <p className="profile-kicker">Temporarily disabled</p>
          <h1>Journal Ingestion</h1>
          <p>期刊导入功能暂时关闭。这个功能之前会触发重任务，导致其它页面卡住；后面会改成后台任务、进度条、review queue 和分页日志后再重新开放。</p>
        </div>
        <div className="hero-metrics">
          <div><span>Status</span><strong>OFF</strong></div>
          <div><span>Mode</span><strong>Safe</strong></div>
          <div><span>Next</span><strong>Job</strong></div>
        </div>
      </section>

      <div className="mt-5 bg-surface-panel border border-line rounded-xl p-4 shadow-sm text-sm text-ink-secondary space-y-2">
        <p><b>重新开放前必须完成：</b></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>后端后台任务队列，不能由前端同步触发导入。</li>
          <li>进度查询接口和取消任务接口。</li>
          <li>ingest_review_queue，边界论文进入复核，不直接入库。</li>
          <li>分页日志，避免一次性渲染大量导入记录。</li>
        </ul>
      </div>
    </div>
  )
}
