const adminSiteUrl = import.meta.env.VITE_ADMIN_SITE_URL || 'http://localhost:5176'

export default function AdminRedirectPage() {
  return (
    <div className="legal-page">
      <section className="legal-hero">
        <div>
          <span>独立管理后台</span>
          <h1>管理后台已独立部署</h1>
          <p>
            公共站点只保留产品访问和申请入口；管理操作应进入独立后台域名，并叠加访问网关、VPN
            或同等级控制，再由后端校验管理员权限。
          </p>
        </div>
        <a className="legal-tab active" href={adminSiteUrl}>
          打开独立管理后台
        </a>
      </section>
    </div>
  )
}
