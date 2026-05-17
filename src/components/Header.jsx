import './Header.css'

export default function Header({ title, children }) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="brand-name">WhatsOn?</span>
        {title && <span className="header-title">{title}</span>}
      </div>
      {children && <div className="header-actions">{children}</div>}
    </header>
  )
}
