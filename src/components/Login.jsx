import { useState } from 'react'

export default function Login({ signIn }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await signIn(email.trim(), senha)
    setLoading(false)
    if (error) {
      setErro(error.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.'
        : error.message)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <img className="login-logo" src="/logo.png" alt="Clivapec Agropecuária" />
        <h2>Gestão de Pendências, Rebate e Premiações</h2>
        <p className="login-sub">Faça login para acessar o sistema</p>
        <form onSubmit={submit} autoComplete="on">
          <div className="login-field">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com" autoComplete="username" />
          </div>
          <div className="login-field">
            <label htmlFor="senha">Senha</label>
            <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha" autoComplete="current-password" />
          </div>
          <div className="login-error">{erro}</div>
          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
      <div className="login-foot">Clivapec Agropecuária · Sistema interno de gestão</div>
    </div>
  )
}
