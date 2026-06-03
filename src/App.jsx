import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, supabaseConfigured } from './supabaseClient'
import { loadAll, ensureSeed } from './lib/api'
import Header from './components/Header'
import Login from './components/Login'
import Modal from './components/Modal'
import Pendencias from './components/Pendencias'
import Rebate from './components/Rebate'
import Premiacoes from './components/Premiacoes'

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [view, setView] = useState('pendencias')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  // ----- toast -----
  const [toastMsg, setToastMsg] = useState('')
  const toastTimer = useRef(null)
  const toast = useCallback((msg) => {
    setToastMsg(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(''), 2800)
  }, [])

  // ----- confirm -----
  const [confirmState, setConfirmState] = useState(null)
  const confirm = useCallback((opts) => setConfirmState(opts), [])

  // ----- auth -----
  useEffect(() => {
    if (!supabaseConfigured) { setChecking(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // ----- carregar dados quando logado -----
  const reload = useCallback(async () => {
    try {
      const d = await loadAll()
      setData(d)
      setLoadError('')
    } catch (e) {
      setLoadError(e.message || String(e))
    }
  }, [])

  useEffect(() => {
    if (!session) { setData(null); return }
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        await ensureSeed()
        const d = await loadAll()
        if (alive) { setData(d); setLoadError('') }
      } catch (e) {
        if (alive) setLoadError(e.message || String(e))
      }
      if (alive) setLoading(false)
    })()
    return () => { alive = false }
  }, [session])

  async function signIn(email, password) {
    return await supabase.auth.signInWithPassword({ email, password })
  }
  async function logout() {
    setConfirmState({
      titulo: 'Sair do sistema',
      msg: 'Deseja encerrar a sessão?',
      okText: 'Sair',
      onOk: async () => { await supabase.auth.signOut() }
    })
  }

  const toastEl = <div id="toast" className={toastMsg ? 'show' : ''}>{toastMsg}</div>

  const confirmEl = confirmState && (
    <Modal small title={confirmState.titulo || 'Confirmar'} onClose={() => setConfirmState(null)}
      footer={<>
        <button className="btn btn-ghost" onClick={() => setConfirmState(null)}>Cancelar</button>
        <button className="btn btn-danger" onClick={async () => {
          const cb = confirmState.onOk; setConfirmState(null); if (cb) await cb()
        }}>{confirmState.okText || 'Excluir'}</button>
      </>}>
      <p className="confirm-msg">{confirmState.msg}</p>
      {confirmState.warn && <div className="confirm-warn">{confirmState.warn}</div>}
    </Modal>
  )

  // ----- telas -----
  if (!supabaseConfigured) return <SetupScreen />

  if (checking) return <CenterSpinner />

  if (!session) {
    return (<>
      <Login signIn={signIn} />
      {toastEl}
    </>)
  }

  const ctx = { data, reload, toast, confirm }

  return (
    <>
      <Header view={view} setView={setView} onLogout={logout} />
      <div className="wrap">
        {loading && <CenterSpinner inline />}
        {loadError && !loading && (
          <div className="no-result">
            <span className="ico">⚠️</span>
            Erro ao carregar os dados.<br />{loadError}
            <div style={{ marginTop: 14 }}>
              <button className="btn btn-primary" onClick={reload}>Tentar novamente</button>
            </div>
          </div>
        )}
        {!loading && !loadError && data && (
          <>
            {view === 'pendencias' && <Pendencias {...ctx} />}
            {view === 'rebate' && <Rebate {...ctx} />}
            {view === 'premiacoes' && <Premiacoes {...ctx} />}
          </>
        )}
      </div>
      {toastEl}
      {confirmEl}
    </>
  )
}

function CenterSpinner({ inline }) {
  return (
    <div className="loading" style={inline ? { minHeight: '40vh' } : undefined}>
      <div className="spinner" />
      <span>Carregando...</span>
    </div>
  )
}

function SetupScreen() {
  return (
    <div className="login-screen">
      <div className="login-card">
        <img className="login-logo" src="/logo.png" alt="Clivapec" />
        <h2>Configuração necessária</h2>
        <p className="login-sub">Falta conectar o Supabase</p>
        <div className="setup-box">
          1. Crie um arquivo <code>.env</code> na raiz do projeto (copie de <code>.env.example</code>).<br />
          2. Preencha <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> com os dados do seu projeto Supabase
          (em <b>Project Settings → API</b>).<br />
          3. Pare o servidor (Ctrl+C) e rode <code>npm run dev</code> de novo.<br /><br />
          Veja o passo a passo completo no arquivo <code>README.md</code>.
        </div>
      </div>
      <div className="login-foot">Clivapec Agropecuária · Sistema interno de gestão</div>
    </div>
  )
}
