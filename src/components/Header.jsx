export default function Header({ view, setView, onLogout }) {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })
  const tabs = [
    { id: 'pendencias', label: '📋 Pendências' },
    { id: 'rebate', label: '💰 Rebate' },
    { id: 'premiacoes', label: '🏆 Premiações' }
  ]
  return (
    <div className="topbar">
      <header>
        <div className="logo-badge">
          <img src="/logo.png" alt="Clivapec" />
        </div>
        <div className="brand">
          <h1>Pendências com Laboratórios</h1>
          <p>Gestão de Propostas, Negociações, Rebate e Premiações</p>
        </div>
        <div className="spacer" />
        <div className="header-date">{hoje}</div>
        <button className="btn-logout" onClick={onLogout} title="Encerrar sessão">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
          Sair
        </button>
      </header>
      <nav className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={'tab' + (view === t.id ? ' active' : '')} onClick={() => setView(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
