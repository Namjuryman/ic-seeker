const adminSiteUrl = import.meta.env.VITE_ADMIN_SITE_URL || 'http://localhost:5176'

export default function AdminRedirectPage() {
  return (
    <div className="legal-page">
      <section className="legal-hero">
        <div>
          <span>Private control plane</span>
          <h1>管理后台已独立部署</h1>
          <p>
            公共站点不再内置管理页面。生产环境应使用独立后台域名，并叠加 Cloudflare Access、VPN
            或同等级访问控制，再由后端校验管理员权限。
          </p>
        </div>
        <a className="legal-tab active" href={adminSiteUrl}>
          打开独立管理后台
        </a>
      </section>
    </div>
  )
}
