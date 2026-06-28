import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../api'

const planOptions = [
  { value: 'research', label: '个人研究 / 学习' },
  { value: 'pro', label: 'Pro 工作流' },
  { value: 'lab', label: '课题组 / 实验室' },
  { value: 'enterprise', label: '企业情报' },
  { value: 'private_deploy', label: '私有化部署' },
]

export default function AccessRequestPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [affiliation, setAffiliation] = useState('')
  const [planInterest, setPlanInterest] = useState('research')
  const [intendedUse, setIntendedUse] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.createAccessRequest({ email, name, affiliation, planInterest, intendedUse }),
  })

  const submitted = mutation.isSuccess

  return (
    <main className="access-page">
      <section className="access-hero">
        <div className="ss-brand access-brand">
          <div className="ss-brand-logo">S</div>
          <div>
            <strong>SiliconScope</strong>
            <span>IC intelligence private beta</span>
          </div>
        </div>
        <div className="access-hero-grid">
          <div>
            <span>Controlled access</span>
            <h1>申请 SiliconScope 私测访问</h1>
            <p>
              当前版本适合 IC 论文搜索、导师/机构画像、企业情报、学习路线和元数据报告探索。
              访问申请会进入独立后台审批，普通用户看不到管理端。
            </p>
            <div className="access-hero-actions">
              <Link to="/">返回登录</Link>
              <Link to="/legal">查看政策边界</Link>
            </div>
          </div>
          <aside>
            <strong>What you get</strong>
            <ul>
              <li>IC metadata search and topic maps</li>
              <li>Company, mentor, institution intelligence</li>
              <li>Learning roadmap and daily circuit workspace</li>
              <li>Export/report center with quota controls</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="access-layout">
        <form
          className="access-form"
          onSubmit={(event) => {
            event.preventDefault()
            mutation.mutate()
          }}
        >
          <div>
            <span>Request form</span>
            <h2>告诉我你想怎么用</h2>
            <p>审批后可以通过邮件或人工方式发放账号/密码。这里不会创建公开账号。</p>
          </div>

          <label>
            邮箱
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
          </label>
          <label>
            名字
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="姓名 / 昵称" />
          </label>
          <label>
            学校 / 公司 / 机构
            <input value={affiliation} onChange={(event) => setAffiliation(event.target.value)} placeholder="University / Lab / Company" />
          </label>
          <label>
            使用方向
            <select value={planInterest} onChange={(event) => setPlanInterest(event.target.value)}>
              {planOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            使用场景
            <textarea
              value={intendedUse}
              onChange={(event) => setIntendedUse(event.target.value)}
              placeholder="例如：模拟 IC 论文跟踪、导师分析、企业岗位路线、课题组文献管理..."
              rows={6}
            />
          </label>

          {mutation.isError && <div className="ss-login-error">{(mutation.error as any)?.response?.data?.error || '提交失败，请检查邮箱。'}</div>}
          {submitted && (
            <div className="access-success">
              <strong>{mutation.data?.duplicate ? '已更新你的申请' : '申请已收到'}</strong>
              <span>状态：{mutation.data?.row.status || 'pending'}。下一步在后台审批，不会公开显示你的信息。</span>
            </div>
          )}
          <button disabled={mutation.isPending || !email} type="submit">
            {mutation.isPending ? '提交中...' : '提交访问申请'}
          </button>
        </form>

        <aside className="access-notes">
          <div>
            <span>Deployment model</span>
            <h3>公网展示和后台分离</h3>
            <p>
              推荐使用 www / api / admin 三个域名。公网只放产品和申请入口，admin 域名再叠加 Cloudflare Access、VPN 或等效安全网关。
            </p>
          </div>
          <div>
            <span>Data boundary</span>
            <h3>元数据优先</h3>
            <p>
              平台展示 DOI、摘要、作者、机构、学习路线与分析信号。论文全文/PDF 访问仍跳转出版社或用户自己的授权来源。
            </p>
          </div>
        </aside>
      </section>
    </main>
  )
}
