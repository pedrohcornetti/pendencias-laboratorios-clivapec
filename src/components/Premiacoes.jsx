import { useState } from 'react'
import { todayISO, fmtDate, norm, diffDays, compressImage } from '../lib/helpers'
import * as api from '../lib/api'
import Modal from './Modal'

function campStatus(c) {
  const t = todayISO()
  const ini = c.inicio ? String(c.inicio).slice(0, 10) : ''
  const fim = c.fim ? String(c.fim).slice(0, 10) : ''
  if (ini && t < ini) return 'Em breve'
  if (fim && t > fim) return 'Encerrada'
  return 'Ativa'
}
const campCls = (st) => st === 'Ativa' ? 'ativa' : (st === 'Em breve' ? 'embreve' : 'encerrada')
const statusRank = (s) => s === 'Ativa' ? 0 : (s === 'Em breve' ? 1 : 2)
const finCls = (f) => f === 'Enviado ao financeiro' ? 'enviado' : (f === 'Apurado' ? 'apurado' : 'naoapurado')
const finLabel = (f) => f === 'Enviado ao financeiro' ? '✓ Enviado ao financeiro' : (f === 'Apurado' ? 'Apurado' : 'Não apurado')

export default function Premiacoes({ data, reload, toast, confirm }) {
  const premiacoes = data.premiacoes
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('Todas')
  const [modal, setModal] = useState(null)   // { camp|null }
  const [viewFoto, setViewFoto] = useState(null) // path

  let ativas = 0, embreve = 0, enc = 0
  premiacoes.forEach((c) => { const s = campStatus(c); if (s === 'Ativa') ativas++; else if (s === 'Em breve') embreve++; else enc++ })

  const q = norm(search)
  let list = premiacoes.map((c) => ({ c, st: campStatus(c) }))
  if (filtro !== 'Todas') list = list.filter((x) => x.st === filtro)
  if (q) list = list.filter((x) => norm(x.c.titulo || '').indexOf(q) > -1 || norm(x.c.laboratorio || '').indexOf(q) > -1)
  list.sort((a, b) => {
    const r = statusRank(a.st) - statusRank(b.st)
    if (r) return r
    if (a.st === 'Encerrada') return String(b.c.fim || '').localeCompare(String(a.c.fim || ''))
    const af = a.c.fim || a.c.inicio || '9999-12-31', bf = b.c.fim || b.c.inicio || '9999-12-31'
    if (af !== bf) return af < bf ? -1 : 1
    return String(b.c.created_at || '').localeCompare(String(a.c.created_at || ''))
  })

  async function deletePrem(c) {
    confirm({
      titulo: 'Excluir campanha', msg: `Excluir a campanha "${c.titulo || '(sem nome)'}"?`,
      warn: 'Esta ação não pode ser desfeita.', okText: 'Excluir campanha',
      onOk: async () => {
        await api.deletePremiacao(c.id)
        if (c.foto_path) { try { await api.deleteFoto(c.foto_path) } catch {} }
        await reload(); toast('✓ Campanha excluída')
      }
    })
  }

  return (
    <>
      <div className="stats">
        <div className="stat rebate-total"><div className="stat-ico">🏆</div><div><div className="stat-num">{ativas}</div><div className="stat-lbl">Campanhas ativas</div></div></div>
        <div className="stat"><div className="stat-ico b">🔜</div><div><div className="stat-num">{embreve}</div><div className="stat-lbl">Em breve</div></div></div>
        <div className="stat"><div className="stat-ico g">🏁</div><div><div className="stat-num">{enc}</div><div className="stat-lbl">Encerradas</div></div></div>
        <div className="stat"><div className="stat-ico a">📋</div><div><div className="stat-num">{premiacoes.length}</div><div className="stat-lbl">Total cadastradas</div></div></div>
      </div>

      <div className="toolbar">
        <div className="toolbar-row">
          <button className="btn btn-primary" onClick={() => setModal({ camp: null })}>+ Nova Campanha</button>
          <div className="seg">
            {[['Todas', 'Todas'], ['Ativa', 'Ativas'], ['Em breve', 'Em breve'], ['Encerrada', 'Encerradas']].map(([v, l]) => (
              <button key={v} className={filtro === v ? 'active' : ''} onClick={() => setFiltro(v)}>{l}</button>
            ))}
          </div>
          <div className="search" style={{ maxWidth: 300 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar campanha..." />
          </div>
        </div>
      </div>

      <div className="list-info">Exibindo {list.length} de {premiacoes.length} campanha(s)</div>

      {premiacoes.length === 0 ? (
        <div className="no-result"><span className="ico">🏆</span>Nenhuma campanha cadastrada.<br />Clique em "Nova Campanha" para registrar as premiações ativas e suas regras.</div>
      ) : list.length === 0 ? (
        <div className="no-result"><span className="ico">🔍</span>Nenhuma campanha encontrada para o filtro/busca.</div>
      ) : list.map(({ c, st }) => <CampCard key={c.id} c={c} st={st} onEdit={() => setModal({ camp: c })} onDelete={() => deletePrem(c)} onViewFoto={() => setViewFoto(c.foto_path)} />)}

      {modal && <PremModal camp={modal.camp} toast={toast}
        onClose={() => setModal(null)} onDone={async (msg) => { setModal(null); await reload(); toast(msg) }} />}
      {viewFoto && (
        <Modal viewer onClose={() => setViewFoto(null)}>
          <div className="foto-viewer">
            <button className="modal-close foto-close" onClick={() => setViewFoto(null)}>&times;</button>
            <img src={api.fotoUrl(viewFoto)} alt="Foto da apuração" />
          </div>
        </Modal>
      )}
    </>
  )
}

function CampCard({ c, st, onEdit, onDelete, onViewFoto }) {
  const cls = campCls(st)
  const fin = c.financeiro || 'Não apurado'
  const ini = c.inicio ? String(c.inicio).slice(0, 10) : '', fim = c.fim ? String(c.fim).slice(0, 10) : ''
  let periodo = 'Sem período definido'
  if (ini && fim) periodo = fmtDate(ini) + ' até ' + fmtDate(fim)
  else if (ini) periodo = 'A partir de ' + fmtDate(ini)
  else if (fim) periodo = 'Até ' + fmtDate(fim)
  let urg = ''
  const t = todayISO()
  if (st === 'Ativa' && fim) { const d = diffDays(t, fim); urg = d <= 0 ? 'Encerra hoje' : (d === 1 ? 'Encerra amanhã' : 'Encerra em ' + d + ' dias') }
  else if (st === 'Em breve' && ini) { const d = diffDays(t, ini); urg = d <= 0 ? 'Começa hoje' : (d === 1 ? 'Começa amanhã' : 'Começa em ' + d + ' dias') }

  return (
    <div className={'camp-card ' + cls}>
      <div className="camp-head">
        <span className="camp-title">{c.titulo || '(sem nome)'}</span>
        <span className={'camp-chip ' + cls}>{st}</span>
        <span className={'fin-chip ' + finCls(fin)}>{finLabel(fin)}</span>
        <div className="camp-actions">
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>✎ Editar</button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>🗑 Excluir</button>
        </div>
      </div>
      <div className="camp-meta-row">
        {c.laboratorio && <span className="mi lab">🏢 {c.laboratorio}</span>}
        <span className="mi">📆 {periodo}</span>
        {urg && <span className="mi urg">⏳ {urg}</span>}
      </div>
      {c.premio && <div className="camp-prize"><span className="ico">🏆</span><div><div className="k">Premiação</div><div className="v">{c.premio}</div></div></div>}
      {c.meta && <div className="camp-block meta"><div className="k">🎯 Meta / Objetivo</div><div className="v">{c.meta}</div></div>}
      {c.regras && <div className="camp-block"><div className="k">📋 Regras da campanha</div><div className="v">{c.regras}</div></div>}
      {c.observacoes && <div className="camp-block"><div className="k">📝 Observações</div><div className="v">{c.observacoes}</div></div>}
      {c.foto_path && <div className="camp-foto-wrap"><img className="camp-foto" src={api.fotoUrl(c.foto_path)} alt="Foto da apuração" title="Clique para ampliar" onClick={onViewFoto} /></div>}
    </div>
  )
}

function PremModal({ camp, onClose, onDone, toast }) {
  const editing = !!camp
  const [f, setF] = useState(() => ({
    titulo: camp?.titulo || '', laboratorio: camp?.laboratorio || '',
    inicio: camp?.inicio ? String(camp.inicio).slice(0, 10) : '', fim: camp?.fim ? String(camp.fim).slice(0, 10) : '',
    premio: camp?.premio || '', meta: camp?.meta || '', regras: camp?.regras || '', observacoes: camp?.observacoes || '',
    financeiro: camp?.financeiro || 'Não apurado'
  }))
  const [err, setErr] = useState(false)
  const [errFim, setErrFim] = useState(false)
  const [saving, setSaving] = useState(false)
  // foto
  const existingPath = camp?.foto_path || null
  const [newBlob, setNewBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(existingPath ? api.fotoUrl(existingPath) : null)
  const [removed, setRemoved] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  async function pickFile(e) {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (!/^image\//.test(file.type)) { toast('⚠ Selecione um arquivo de imagem'); return }
    if (file.size > 20 * 1024 * 1024) { toast('⚠ Imagem muito grande (máx. ~20MB)'); return }
    try {
      const blob = await compressImage(file, 1400, 0.72)
      setNewBlob(blob)
      setPreviewUrl(URL.createObjectURL(blob))
      setRemoved(false)
    } catch { toast('⚠ Não foi possível ler a imagem') }
  }
  function removeFoto() { setNewBlob(null); setPreviewUrl(null); setRemoved(true) }

  async function save() {
    if (!f.titulo.trim()) { setErr(true); return }
    if (f.inicio && f.fim && f.fim < f.inicio) { setErrFim(true); toast('⚠ A data final deve ser igual ou posterior à inicial'); return }
    setSaving(true)
    try {
      let finalPath = existingPath
      if (newBlob) finalPath = await api.uploadFoto(newBlob)
      else if (removed) finalPath = null
      const dados = { ...f, titulo: f.titulo.trim(), laboratorio: f.laboratorio.trim(), premio: f.premio.trim(), meta: f.meta.trim(), regras: f.regras.trim(), observacoes: f.observacoes.trim(), foto_path: finalPath }
      if (editing) await api.updatePremiacao(camp.id, dados)
      else await api.addPremiacao(dados)
      // limpa foto antiga substituída/removida (best-effort)
      if ((newBlob || removed) && existingPath && existingPath !== finalPath) { try { await api.deleteFoto(existingPath) } catch {} }
      await onDone(editing ? '✓ Campanha atualizada' : '✓ Campanha cadastrada')
    } catch (e) { setSaving(false); toast('⚠ ' + e.message) }
  }

  return (
    <Modal title={editing ? 'Editar Campanha' : 'Nova Campanha'} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvando...' : (editing ? 'Salvar Alterações' : 'Salvar Campanha')}</button></>}>
      <div className="form-grid">
        <PField label="Nome da campanha" req full><input className={err ? 'err' : ''} value={f.titulo} onChange={(e) => { set('titulo', e.target.value); setErr(false) }} placeholder="Ex.: Campanha de Volume — Junho/2026" /></PField>
        <PField label="Laboratório / Origem" full><input value={f.laboratorio} onChange={(e) => set('laboratorio', e.target.value)} placeholder="Ex.: Elanco, Ourofino... (opcional)" /></PField>
        <PField label="Início"><input type="date" value={f.inicio} onChange={(e) => set('inicio', e.target.value)} /></PField>
        <PField label="Fim"><input type="date" className={errFim ? 'err' : ''} value={f.fim} onChange={(e) => { set('fim', e.target.value); setErrFim(false) }} /></PField>
        <PField label="Premiação / Prêmio" full><input value={f.premio} onChange={(e) => set('premio', e.target.value)} placeholder="Ex.: Viagem, bônus de 2%, brindes..." /></PField>
        <PField label="Meta / Objetivo" full><input value={f.meta} onChange={(e) => set('meta', e.target.value)} placeholder="Ex.: Atingir R$ 50.000 em compras no mês" /></PField>
        <PField label="Regras da campanha" full><textarea style={{ minHeight: 96 }} value={f.regras} onChange={(e) => set('regras', e.target.value)} placeholder="Descreva as regras: como participar, critérios, faixas de premiação, prazos..." /></PField>
        <PField label="Observações" full><textarea value={f.observacoes} onChange={(e) => set('observacoes', e.target.value)} placeholder="Anotações adicionais..." /></PField>
        <PField label="Apuração / Financeiro" full>
          <select value={f.financeiro} onChange={(e) => set('financeiro', e.target.value)}>
            <option value="Não apurado">🔘 Não apurado</option>
            <option value="Apurado">🟡 Apurado — aguardando envio ao financeiro</option>
            <option value="Enviado ao financeiro">🟢 Apurado e enviado ao financeiro</option>
          </select>
        </PField>
        <PField label="Foto da apuração (opcional)" full>
          <div className="foto-upload">
            <label className="btn btn-ghost btn-sm foto-pick">📷 Selecionar foto<input type="file" accept="image/*" hidden onChange={pickFile} /></label>
            <div className="foto-preview">
              {previewUrl ? (<><img src={previewUrl} alt="prévia" /><button type="button" className="btn btn-danger btn-sm" onClick={removeFoto}>Remover foto</button></>)
                : <span className="foto-none">Nenhuma foto anexada</span>}
            </div>
          </div>
          <span className="hint">A imagem é reduzida e enviada para o armazenamento do Supabase.</span>
        </PField>
      </div>
    </Modal>
  )
}

function PField({ label, req, full, children }) {
  return <div className={'field' + (full ? ' full' : '')}><label>{label} {req && <span className="req">*</span>}</label>{children}</div>
}
