import { useState } from 'react'
import { fmtBRL, fmtPerc, fmtDate, fmtNumInput, parseValor, todayISO, norm, downloadCSV } from '../lib/helpers'
import * as api from '../lib/api'
import Modal from './Modal'

const metaEsperado = (m) => (m.percentual == null || m.compra_periodo == null) ? null : m.compra_periodo * m.percentual / 100
const metaRecebido = (m) => (m.recebimentos || []).reduce((s, r) => s + (Number(r.valor) || 0), 0)
const metaFalta = (m) => { const e = metaEsperado(m); return e == null ? null : e - metaRecebido(m) }
function labEsperado(l) { let t = 0, any = false; (l.metas || []).forEach((m) => { const e = metaEsperado(m); if (e != null) { t += e; any = true } }); return any ? t : null }
const labRecebido = (l) => (l.metas || []).reduce((s, m) => s + metaRecebido(m), 0)
function labFalta(l) { let t = 0, any = false; (l.metas || []).forEach((m) => { const e = metaEsperado(m); if (e != null) { t += Math.max(0, e - metaRecebido(m)); any = true } }); return any ? t : null }
function fmtPeriodo(m) {
  if (m.inicio && m.fim) return fmtDate(m.inicio) + ' até ' + fmtDate(m.fim)
  if (m.inicio) return 'A partir de ' + fmtDate(m.inicio)
  if (m.fim) return 'Até ' + fmtDate(m.fim)
  return 'Período não definido'
}

export default function Rebate({ data, reload, toast, confirm }) {
  const labs = data.rebateLabs
  const [search, setSearch] = useState('')
  const [labModal, setLabModal] = useState(null)   // { lab|null }
  const [metaModal, setMetaModal] = useState(null)  // { lab, meta|null }
  const [recModal, setRecModal] = useState(null)    // { lab, meta }

  let esperado = 0, recebido = 0, falta = 0
  labs.forEach((l) => { const e = labEsperado(l); recebido += labRecebido(l); if (e != null) { esperado += e; falta += labFalta(l) } })

  const q = norm(search)
  const list = labs.filter((l) => !q || norm(l.nome).indexOf(q) > -1).slice().sort((a, b) => {
    const ea = labEsperado(a), eb = labEsperado(b)
    const va = ea == null ? -1 : ea, vb = eb == null ? -1 : eb
    if (vb !== va) return vb - va
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

  async function deleteLab(l) {
    confirm({
      titulo: 'Excluir laboratório de rebate', msg: `Remover "${l.nome}" do controle de rebate?`,
      warn: (l.metas || []).length > 0 ? `Atenção: ${l.metas.length} período(s)/meta(s) e seus recebimentos também serão excluídos.` : 'Esta ação não pode ser desfeita.',
      okText: 'Excluir laboratório',
      onOk: async () => { await api.deleteLab(l.id); await reload(); toast('✓ Laboratório excluído') }
    })
  }
  async function deleteMeta(l, m) {
    confirm({
      titulo: 'Excluir período / meta', msg: `Excluir o período "${fmtPeriodo(m)}"?`,
      warn: (m.recebimentos || []).length > 0 ? `Atenção: ${m.recebimentos.length} recebimento(s) deste período também serão excluídos.` : 'Esta ação não pode ser desfeita.',
      okText: 'Excluir período',
      onOk: async () => { await api.deleteMeta(m.id); await reload(); toast('✓ Período excluído') }
    })
  }
  async function deleteRec(m, r) {
    confirm({
      titulo: 'Excluir recebimento', msg: `Excluir o recebimento de ${fmtBRL(r.valor)}?`,
      warn: 'Esta ação não pode ser desfeita.', okText: 'Excluir recebimento',
      onOk: async () => { await api.deleteRecebimento(r.id); await reload(); toast('✓ Recebimento excluído') }
    })
  }

  function exportCSV() {
    if (!labs.length) { toast('⚠ Nenhum laboratório para exportar'); return }
    const num = (n) => n == null ? '' : Number(n).toFixed(2).replace('.', ',')
    const rows = []
    list.forEach((l) => {
      const metas = l.metas || []
      if (!metas.length) rows.push([l.nome, l.classe || '', '', '', '', '', '', '', '', l.observacao || ''])
      else metas.slice().sort((a, b) => String(a.inicio || '').localeCompare(String(b.inicio || ''))).forEach((m) => {
        rows.push([l.nome, l.classe || '', m.inicio ? fmtDate(m.inicio) : '', m.fim ? fmtDate(m.fim) : '',
          m.percentual == null ? '' : String(m.percentual).replace('.', ','), num(m.compra_periodo),
          num(metaEsperado(m)), num(metaRecebido(m)), (() => { const f = metaFalta(m); return f == null ? '' : num(Math.max(0, f)) })(), m.observacao || ''])
      })
    })
    rows.push(['TOTAL', '', '', '', '', '', num(esperado), num(recebido), num(falta), ''])
    downloadCSV('rebate_clivapec_' + todayISO() + '.csv',
      ['Laboratório', 'Classe', 'Início do Período', 'Fim do Período', '% Rebate', 'Compra no Período', 'Meta de Rebate', 'Recebido', 'Falta Receber', 'Observação'], rows)
    toast('✓ ' + labs.length + ' laboratório(s) exportado(s)')
  }

  return (
    <>
      <div className="stats">
        <div className="stat rebate-total"><div className="stat-ico">💰</div><div><div className="stat-num">{fmtBRL(esperado)}</div><div className="stat-lbl">Rebate esperado (total)</div></div></div>
        <div className="stat"><div className="stat-ico g">✅</div><div><div className="stat-num" style={{ color: '#15803d' }}>{fmtBRL(recebido)}</div><div className="stat-lbl">Rebate recebido (total)</div></div></div>
        <div className="stat"><div className="stat-ico a">⏳</div><div><div className="stat-num" style={{ color: 'var(--amber)' }}>{fmtBRL(falta)}</div><div className="stat-lbl">Falta receber</div></div></div>
        <div className="stat"><div className="stat-ico b">🏢</div><div><div className="stat-num">{labs.length}</div><div className="stat-lbl">Laboratórios cadastrados</div></div></div>
      </div>

      <div className="toolbar">
        <div className="toolbar-row">
          <button className="btn btn-primary" onClick={() => setLabModal({ lab: null })}>+ Cadastrar Laboratório</button>
          <div className="search" style={{ maxWidth: 340 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar laboratório..." />
          </div>
          <button className="btn btn-amber" style={{ marginLeft: 'auto' }} onClick={exportCSV}>⬇ Exportar CSV</button>
        </div>
      </div>

      <div className="list-info">Exibindo {list.length} de {labs.length} laboratório(s) de rebate</div>

      {labs.length === 0 ? (
        <div className="no-result"><span className="ico">💰</span>Nenhum laboratório de rebate cadastrado.<br />Clique em "Cadastrar Laboratório" para começar.</div>
      ) : list.length === 0 ? (
        <div className="no-result"><span className="ico">🔍</span>Nenhum laboratório encontrado.</div>
      ) : list.map((l) => {
        const espTot = labEsperado(l), recTot = labRecebido(l), faltaTot = labFalta(l)
        const quitadoLab = espTot != null && espTot > 0 && faltaTot != null && faltaTot <= 0.005
        const metas = (l.metas || []).slice().sort((a, b) => {
          const ai = a.inicio || a.fim || '', bi = b.inicio || b.fim || ''
          if (ai !== bi) return String(bi).localeCompare(String(ai))
          return String(b.created_at || '').localeCompare(String(a.created_at || ''))
        })
        return (
          <div key={l.id} className={'lab-card' + (quitadoLab ? ' quitado' : '')}>
            <div className="lab-head">
              {l.classe && <span className={'badge ' + l.classe}>CLASSE {l.classe}</span>}
              <span className="lab-name">{l.nome}</span>
              <div className="lab-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setLabModal({ lab: l })}>✎ Editar</button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteLab(l)}>🗑 Excluir</button>
              </div>
            </div>
            <div className="lab-summary">
              {espTot != null ? (<>
                <span className="lab-sum">Rebate total: <b>{fmtBRL(espTot)}</b></span>
                <span className="lab-sum green">Recebido: <b>{fmtBRL(recTot)}</b></span>
                <span className="lab-sum amber">Falta: <b>{fmtBRL(faltaTot)}</b></span>
                <span className="lab-sum">Períodos: <b>{metas.length}</b></span>
              </>) : (<>
                <span className="lab-sum green">Recebido: <b>{fmtBRL(recTot)}</b></span>
                <span className="lab-sum muted">Nenhuma meta definida ainda</span>
              </>)}
            </div>
            {l.observacao && <div className="lab-obs"><div>📝 {l.observacao}</div></div>}
            <div className="meta-list">
              {metas.length === 0 ? (
                <div className="lab-receb-empty" style={{ padding: '8px 16px 4px' }}>Nenhum período/meta cadastrado. Clique em "+ Novo período / meta".</div>
              ) : metas.map((m) => <MetaBlock key={m.id} l={l} m={m}
                onEdit={() => setMetaModal({ lab: l, meta: m })}
                onDelete={() => deleteMeta(l, m)}
                onAddRec={() => setRecModal({ lab: l, meta: m })}
                onDelRec={(r) => deleteRec(m, r)} />)}
            </div>
            <div className="lab-addmeta">
              <button className="btn btn-primary btn-sm" onClick={() => setMetaModal({ lab: l, meta: null })}>+ Novo período / meta</button>
            </div>
          </div>
        )
      })}

      {labModal && <LabModal lab={labModal.lab} fornecedores={data.fornecedores} toast={toast}
        onClose={() => setLabModal(null)} onDone={async (msg) => { setLabModal(null); await reload(); toast(msg) }} />}
      {metaModal && <MetaModal lab={metaModal.lab} meta={metaModal.meta} toast={toast}
        onClose={() => setMetaModal(null)} onDone={async (msg) => { setMetaModal(null); await reload(); toast(msg) }} />}
      {recModal && <RecModal lab={recModal.lab} meta={recModal.meta} toast={toast}
        onClose={() => setRecModal(null)} onDone={async (msg) => { setRecModal(null); await reload(); toast(msg) }} />}
    </>
  )
}

function MetaBlock({ l, m, onEdit, onDelete, onAddRec, onDelRec }) {
  const esp = metaEsperado(m), rec = metaRecebido(m), falta = metaFalta(m)
  const pct = (esp != null && esp > 0) ? Math.round(rec / esp * 100) : 0
  const over = esp != null && rec > esp + 0.005
  const quitado = esp != null && esp > 0 && falta != null && falta <= 0.005
  const recs = (m.recebimentos || []).slice().sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')) || String(b.created_at || '').localeCompare(String(a.created_at || '')))
  return (
    <div className={'meta-block' + (quitado ? ' quitado' : '')}>
      <div className="meta-head">
        <span className="meta-period">📆 {fmtPeriodo(m)}</span>
        <span className="meta-tag">{m.percentual == null ? '%: —' : fmtPerc(m.percentual)} · Compra: {m.compra_periodo == null ? '—' : fmtBRL(m.compra_periodo)}</span>
        <div className="meta-actions">
          <button className="btn btn-ghost btn-sm" onClick={onEdit} title="Editar período">✎</button>
          <button className="btn btn-danger btn-sm" onClick={onDelete} title="Excluir período">🗑</button>
        </div>
      </div>
      {esp != null ? (<>
        <div className="lab-figs">
          <div className="lab-fig esperado"><div className="k">Meta de rebate</div><div className="v">{fmtBRL(esp)}</div></div>
          <div className="lab-fig recebido"><div className="k">Recebido</div><div className="v">{fmtBRL(rec)}</div></div>
          <div className={'lab-fig falta' + (falta <= 0.005 ? ' zero' : '')}><div className="k">{falta < -0.005 ? 'Recebido a mais' : 'Falta receber'}</div><div className="v">{fmtBRL(Math.abs(falta))}</div></div>
        </div>
        <div className="lab-prog">
          <div className="lab-prog-bar"><div className={over ? 'over' : ''} style={{ width: Math.min(100, Math.max(0, pct)) + '%' }} /></div>
          <div className="lab-prog-info"><span>{pct}% da meta recebido</span>{quitado ? <span className="ok">✓ Meta quitada</span> : over ? <span className="ok">Recebido acima da meta</span> : <span />}</div>
        </div>
      </>) : (
        <div className="lab-figs">
          <div className="lab-fig recebido"><div className="k">Recebido neste período</div><div className="v">{fmtBRL(rec)}</div></div>
          <div className="lab-fig"><div className="k">Meta de rebate</div><div className="v muted">Informe % e compra</div></div>
        </div>
      )}
      {m.observacao && <div className="lab-obs"><div>📝 {m.observacao}</div></div>}
      <div className="lab-receb">
        <div className="lab-receb-head">
          <span>📥 Recebimentos ({recs.length})</span>
          <button className="btn btn-primary btn-sm" onClick={onAddRec}>+ Registrar recebimento</button>
        </div>
        {recs.length === 0 ? <div className="lab-receb-empty">Nenhum recebimento registrado neste período.</div>
          : recs.map((r) => (
            <div key={r.id} className="lab-receb-item">
              <span className="lab-receb-date">📅 {fmtDate(r.data)}</span>
              <span className="lab-receb-val">{fmtBRL(r.valor)}</span>
              <span className="lab-receb-obs">{r.observacao ? '📝 ' + r.observacao : ''}</span>
              <button className="btn btn-danger btn-sm" onClick={() => onDelRec(r)} title="Excluir recebimento">🗑</button>
            </div>
          ))}
      </div>
    </div>
  )
}

function LabModal({ lab, fornecedores, onClose, onDone, toast }) {
  const editing = !!lab
  const [fid, setFid] = useState(fornecedores[0]?.id || '')
  const [obs, setObs] = useState(lab?.observacao || '')
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true)
    try {
      if (editing) await api.updateLab(lab.id, { observacao: obs.trim() })
      else {
        const f = fornecedores.find((x) => x.id === fid)
        if (!f) { setSaving(false); toast('⚠ Selecione um laboratório'); return }
        await api.addLab({ fornecedor_id: f.id, nome: f.nome, classe: f.classe, observacao: obs.trim() })
      }
      await onDone(editing ? '✓ Laboratório atualizado' : '✓ Laboratório cadastrado')
    } catch (e) { setSaving(false); toast('⚠ ' + e.message) }
  }
  return (
    <Modal small title={editing ? 'Editar Laboratório de Rebate' : 'Cadastrar Laboratório de Rebate'} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button></>}>
      {editing
        ? <div className="sup-context">🏢 <span>{lab.nome}{lab.classe ? ' — Classe ' + lab.classe : ''}</span></div>
        : <RField label="Laboratório" req><select value={fid} onChange={(e) => setFid(e.target.value)}>{fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome} — Classe {f.classe}</option>)}</select></RField>}
      <RField label="Observação"><textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Contato comercial, condições gerais do acordo..." /></RField>
      <span className="hint">💡 Após cadastrar, use "+ Novo período / meta" dentro do laboratório para definir o período, a % e a compra de cada meta.</span>
    </Modal>
  )
}

function MetaModal({ lab, meta, onClose, onDone, toast }) {
  const editing = !!meta
  const [f, setF] = useState(() => ({
    inicio: meta?.inicio ? String(meta.inicio).slice(0, 10) : '',
    fim: meta?.fim ? String(meta.fim).slice(0, 10) : '',
    percentual: meta?.percentual != null ? String(meta.percentual).replace('.', ',') : '',
    compra: meta?.compra_periodo != null ? fmtNumInput(meta.compra_periodo) : '',
    observacao: meta?.observacao || ''
  }))
  const [errFim, setErrFim] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  async function save() {
    if (f.inicio && f.fim && f.fim < f.inicio) { setErrFim(true); toast('⚠ A data final deve ser igual ou posterior à inicial'); return }
    let perc = null, compra = null
    if (f.percentual.trim() !== '') { perc = parseValor(f.percentual); if (isNaN(perc) || perc < 0) { toast('⚠ % inválido'); return } }
    if (f.compra.trim() !== '') { compra = parseValor(f.compra); if (isNaN(compra) || compra < 0) { toast('⚠ Compra inválida'); return } }
    setSaving(true)
    const dados = { inicio: f.inicio, fim: f.fim, percentual: perc, compra_periodo: compra, observacao: f.observacao.trim() }
    try {
      if (editing) await api.updateMeta(meta.id, dados)
      else await api.addMeta(lab.id, dados)
      await onDone(editing ? '✓ Período atualizado' : '✓ Período cadastrado')
    } catch (e) { setSaving(false); toast('⚠ ' + e.message) }
  }
  return (
    <Modal small title={editing ? 'Editar Período / Meta' : 'Novo Período / Meta'} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Período'}</button></>}>
      <div className="sup-context">🏢 <span>{lab.nome}{lab.classe ? ' — Classe ' + lab.classe : ''}</span></div>
      <div className="form-grid">
        <RField label="Início do período"><input type="date" value={f.inicio} onChange={(e) => set('inicio', e.target.value)} /></RField>
        <RField label="Fim do período"><input type="date" className={errFim ? 'err' : ''} value={f.fim} onChange={(e) => { set('fim', e.target.value); setErrFim(false) }} /></RField>
        <RField label="% de rebate"><input value={f.percentual} onChange={(e) => set('percentual', e.target.value)} placeholder="Ex.: 3,5" /></RField>
        <RField label="Compra no período (R$)"><input value={f.compra} onChange={(e) => set('compra', e.target.value)} placeholder="Ex.: 100.000,00" /></RField>
        <RField label="Observação" full><textarea value={f.observacao} onChange={(e) => set('observacao', e.target.value)} placeholder="Ex.: Meta trimestral — jan a mar/2026" /></RField>
        <div className="field full"><span className="hint">💡 Meta = Compra × %. Todos os campos são opcionais.</span></div>
      </div>
    </Modal>
  )
}

function RecModal({ lab, meta, onClose, onDone, toast }) {
  const [valor, setValor] = useState('')
  const [d, setD] = useState(todayISO())
  const [obs, setObs] = useState('')
  const [err, setErr] = useState(false)
  const [saving, setSaving] = useState(false)
  async function save() {
    const v = parseValor(valor)
    if (isNaN(v) || v <= 0) { setErr(true); return }
    setSaving(true)
    try {
      await api.addRecebimento(meta.id, { valor: Math.abs(v), data: d, observacao: obs.trim() })
      await onDone('✓ Recebimento registrado')
    } catch (e) { setSaving(false); toast('⚠ ' + e.message) }
  }
  return (
    <Modal small title="Registrar Recebimento de Rebate" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Recebimento'}</button></>}>
      <div className="sup-context">🏢 <span>{lab.nome} · 📆 {fmtPeriodo(meta)}</span></div>
      <RField label="Valor recebido (R$)" req><input className={err ? 'err' : ''} value={valor} onChange={(e) => { setValor(e.target.value); setErr(false) }} placeholder="0,00" /></RField>
      <RField label="Data"><input type="date" value={d} onChange={(e) => setD(e.target.value)} /></RField>
      <RField label="Observação"><textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: Crédito referente à Nota Fiscal 12345" /></RField>
    </Modal>
  )
}

function RField({ label, req, full, children }) {
  return <div className={'field' + (full ? ' full' : '')}><label>{label} {req && <span className="req">*</span>}</label>{children}</div>
}
