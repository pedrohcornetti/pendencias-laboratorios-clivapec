import { useState } from 'react'
import { todayISO, fmtDate, norm, weekStartISO, downloadCSV } from '../lib/helpers'
import * as api from '../lib/api'
import Modal from './Modal'

const PRIO_RANK = { Alta: 0, 'Média': 1, Baixa: 2 }
const STATUS = ['Aberta', 'Em andamento', 'Aguardando retorno', 'Resolvida', 'Cancelada']
const TIPOS = ['Proposta Comercial', 'Negociação de Preço']
const PRIOS = ['Alta', 'Média', 'Baixa']

const isClosed = (p) => p.status === 'Resolvida' || p.status === 'Cancelada'
const isAberta = (p) => !isClosed(p)
const isResolvida = (p) => p.status === 'Resolvida'
const isOverdue = (p) => !!p.prazo && p.prazo < todayISO() && isAberta(p)
const chipCls = (st) => ({ 'Aberta': 'Aberta', 'Em andamento': 'EmAndamento', 'Aguardando retorno': 'Aguardando', 'Resolvida': 'Resolvida', 'Cancelada': 'Cancelada' }[st] || 'Aberta')

export default function Pendencias({ data, reload, toast, confirm }) {
  const fornecedores = data.fornecedores
  const [search, setSearch] = useState('')
  const [classe, setClasse] = useState('Todos')
  const [fStatus, setFStatus] = useState('Todos')
  const [fTipo, setFTipo] = useState('Todos')
  const [fPrio, setFPrio] = useState('Todos')
  const [fVenc, setFVenc] = useState(false)
  const [fSort, setFSort] = useState('criacao')
  const [expanded, setExpanded] = useState(() => new Set())
  const [pendModal, setPendModal] = useState(null)   // { fornecedor, pend }
  const [supModal, setSupModal] = useState(null)      // { fornecedor|null }

  const filterActive = fStatus !== 'Todos' || fTipo !== 'Todos' || fPrio !== 'Todos' || fVenc

  function matchPend(p) {
    if (fStatus !== 'Todos' && p.status !== fStatus) return false
    if (fTipo !== 'Todos' && p.tipo !== fTipo) return false
    if (fPrio !== 'Todos' && p.prioridade !== fPrio) return false
    if (fVenc && !isOverdue(p)) return false
    return true
  }
  function sortPend(list) {
    return list.slice().sort((a, b) => {
      const ac = isClosed(a) ? 1 : 0, bc = isClosed(b) ? 1 : 0
      if (ac !== bc) return ac - bc
      if (fSort === 'prioridade') {
        const d = PRIO_RANK[a.prioridade] - PRIO_RANK[b.prioridade]
        if (d) return d
        return String(b.data_criacao || '').localeCompare(String(a.data_criacao || ''))
      }
      if (fSort === 'prazo') {
        const ap = a.prazo || '9999-12-31', bp = b.prazo || '9999-12-31'
        if (ap !== bp) return ap < bp ? -1 : 1
        return String(b.data_criacao || '').localeCompare(String(a.data_criacao || ''))
      }
      return String(b.data_criacao || '').localeCompare(String(a.data_criacao || ''))
    })
  }

  // ----- stats -----
  let abertas = 0, vencidas = 0, resSemana = 0, pc = 0, np = 0
  const ws = weekStartISO()
  fornecedores.forEach((f) => f.pendencias.forEach((p) => {
    if (isAberta(p)) { abertas++; if (p.tipo === 'Proposta Comercial') pc++; else np++; if (isOverdue(p)) vencidas++ }
    if (isResolvida(p) && p.data_resolucao && String(p.data_resolucao).slice(0, 10) >= ws) resSemana++
  }))
  const totalTipo = pc + np
  const pcPct = totalTipo ? Math.round(pc / totalTipo * 100) : 50
  const npPct = 100 - (totalTipo ? pcPct : 50)

  // ----- lista filtrada -----
  const q = norm(search)
  const sups = fornecedores.filter((f) => {
    if (classe !== 'Todos' && f.classe !== classe) return false
    if (q && norm(f.nome).indexOf(q) === -1) return false
    if (filterActive && f.pendencias.filter(matchPend).length === 0) return false
    return true
  })

  function toggle(id) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function deleteFornecedor(f) {
    confirm({
      titulo: 'Remover fornecedor',
      msg: `Deseja remover "${f.nome}"?`,
      warn: f.pendencias.length > 0 ? `Atenção: ${f.pendencias.length} pendência(s) vinculada(s) também serão excluídas.` : 'Esta ação não pode ser desfeita.',
      okText: 'Remover fornecedor',
      onOk: async () => { await api.deleteFornecedor(f.id); await reload(); toast('✓ Fornecedor removido') }
    })
  }
  async function deletePend(f, p) {
    confirm({
      titulo: 'Excluir pendência', msg: `Excluir a pendência "${p.produto || '(sem assunto)'}"?`,
      warn: 'Esta ação não pode ser desfeita.', okText: 'Excluir pendência',
      onOk: async () => { await api.deletePendencia(p.id); await reload(); toast('✓ Pendência excluída') }
    })
  }

  function exportCSV() {
    const rows = []
    fornecedores.forEach((f) => f.pendencias.filter(isAberta).forEach((p) => {
      rows.push([f.nome, p.tipo, p.produto || '', p.status, p.prioridade, fmtDate(p.prazo), p.contato || ''])
    }))
    if (!rows.length) { toast('⚠ Nenhuma pendência aberta para exportar'); return }
    downloadCSV('pendencias_clivapec_' + todayISO() + '.csv',
      ['Fornecedor', 'Tipo', 'Produto/Assunto', 'Status', 'Prioridade', 'Prazo', 'Contato'], rows)
    toast('✓ ' + rows.length + ' pendência(s) exportada(s)')
  }

  return (
    <>
      <div className="stats">
        <div className="stat"><div className="stat-ico b">📋</div><div><div className="stat-num">{abertas}</div><div className="stat-lbl">Pendências abertas</div></div></div>
        <div className="stat"><div className="stat-ico r">⚠️</div><div><div className={'stat-num' + (vencidas ? ' red' : '')}>{vencidas}</div><div className="stat-lbl">Com prazo vencido</div></div></div>
        <div className="stat"><div className="stat-ico g">✅</div><div><div className="stat-num green">{resSemana}</div><div className="stat-lbl">Resolvidas nesta semana</div></div></div>
        <div className="stat dist">
          <div className="dist-head"><span>Distribuição por tipo</span><span>{totalTipo} aberta(s)</span></div>
          <div className="dist-bar"><div className="pc" style={{ width: pcPct + '%' }} /><div className="np" style={{ width: npPct + '%' }} /></div>
          <div className="dist-legend">
            <span><span className="dot" style={{ background: 'var(--blue-2)' }} />Proposta: <b>{pc}</b></span>
            <span><span className="dot" style={{ background: 'var(--amber)' }} />Negociação: <b>{np}</b></span>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-row">
          <div className="search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar fornecedor por nome..." />
          </div>
          <div className="seg">
            {['Todos', 'A', 'B', 'C'].map((c) => (
              <button key={c} className={classe === c ? 'active' : ''} onClick={() => setClasse(c)}>{c === 'Todos' ? 'Todos' : 'Classe ' + c}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setSupModal({ fornecedor: null })}>+ Adicionar Fornecedor</button>
          <button className="btn btn-amber" onClick={exportCSV}>⬇ Exportar CSV</button>
        </div>
        <div className="toolbar-row">
          <Mini label="Status" value={fStatus} onChange={setFStatus} options={['Todos', ...STATUS]} />
          <Mini label="Tipo" value={fTipo} onChange={setFTipo} options={['Todos', ...TIPOS]} />
          <Mini label="Prioridade" value={fPrio} onChange={setFPrio} options={['Todos', ...PRIOS]} />
          <Mini label="Ordenar por" value={fSort} onChange={setFSort} options={[['criacao', 'Data de criação'], ['prazo', 'Prazo / Follow-up'], ['prioridade', 'Prioridade']]} />
          <label className="chk"><input type="checkbox" checked={fVenc} onChange={(e) => setFVenc(e.target.checked)} /> Apenas prazo vencido</label>
          <div className="field-mini" style={{ marginLeft: 'auto' }}>
            <label>&nbsp;</label>
            <div style={{ display: 'flex', gap: 7 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(new Set(fornecedores.map((f) => f.id)))}>Expandir todos</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(new Set())}>Recolher todos</button>
            </div>
          </div>
        </div>
      </div>

      <div className="list-info">
        Exibindo {sups.length} de {fornecedores.length} fornecedor(es){filterActive ? ' — filtro de pendências ativo' : ''}
      </div>

      {sups.length === 0 ? (
        <div className="no-result"><span className="ico">📭</span>{filterActive ? 'Nenhuma pendência corresponde aos filtros.' : 'Nenhum fornecedor encontrado.'}</div>
      ) : sups.map((f) => {
        const open = filterActive || expanded.has(f.id)
        const ab = f.pendencias.filter(isAberta).length
        const res = f.pendencias.filter(isResolvida).length
        const venc = f.pendencias.filter(isOverdue).length
        const matched = filterActive ? f.pendencias.filter(matchPend) : f.pendencias.slice()
        const ordered = sortPend(matched)
        return (
          <div key={f.id} className={'supplier' + (open ? ' open' : '')}>
            <div className="sup-head" onClick={() => !filterActive && toggle(f.id)}>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              <span className="sup-order">{f.ordem}</span>
              <span className="sup-name">{f.nome}</span>
              <span className={'badge ' + f.classe}>CLASSE {f.classe}</span>
              <span className="counters">
                <span className={'pill open-c' + (ab ? '' : ' zero')}>{ab} aberta{ab === 1 ? '' : 's'}</span>
                {venc > 0 && <span className="pill venc-c">{venc} vencida{venc === 1 ? '' : 's'}</span>}
                <span className="pill res-c">{res} resolvida{res === 1 ? '' : 's'}</span>
              </span>
              <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setSupModal({ fornecedor: f }) }}>✎ Editar</button>
              <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); deleteFornecedor(f) }}>Remover</button>
            </div>
            {open && (
              <div className="sup-body"><div className="sup-body-inner">
                {f.pendencias.length === 0 ? (
                  <div className="empty-pend"><span className="ico">🗂️</span><span>Nenhuma pendência registrada</span>
                    <button className="btn btn-primary btn-sm" onClick={() => setPendModal({ fornecedor: f, pend: null })}>+ Nova Pendência</button>
                  </div>
                ) : ordered.length === 0 ? (
                  <div className="empty-pend"><span className="ico">🔍</span><span>Nenhuma pendência corresponde aos filtros</span></div>
                ) : (<>
                  {ordered.map((p) => <PendCard key={p.id} f={f} p={p} onEdit={() => setPendModal({ fornecedor: f, pend: p })} onDelete={() => deletePend(f, p)} />)}
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={() => setPendModal({ fornecedor: f, pend: null })}>+ Nova Pendência</button>
                </>)}
              </div></div>
            )}
          </div>
        )
      })}

      {pendModal && <PendModal {...pendModal} toast={toast}
        onClose={() => setPendModal(null)}
        onDone={async (msg) => { setPendModal(null); await reload(); toast(msg) }} />}
      {supModal && <SupModal fornecedor={supModal.fornecedor} toast={toast}
        onClose={() => setSupModal(null)}
        onDone={async (msg) => { setSupModal(null); await reload(); toast(msg) }} />}
    </>
  )
}

function Mini({ label, value, onChange, options }) {
  return (
    <div className="field-mini">
      <label>{label}</label>
      <select className="mini" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => Array.isArray(o)
          ? <option key={o[0]} value={o[0]}>{o[1]}</option>
          : <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function PendCard({ f, p, onEdit, onDelete }) {
  const overdue = isOverdue(p)
  const tipoCls = p.tipo === 'Proposta Comercial' ? 'proposta' : 'negociacao'
  return (
    <div className={'pend prio-' + p.prioridade + (isResolvida(p) ? ' resolved' : '') + (overdue ? ' overdue' : '')}>
      <div className="pend-top">
        <span className={'tipo-tag ' + tipoCls}>{p.tipo}</span>
        <span className="pend-title">{p.produto || '(sem assunto)'}</span>
        <span className={'chip ' + chipCls(p.status)}>{p.status}</span>
      </div>
      {p.descricao && <div className="pend-desc">{p.descricao}</div>}
      <div className="pend-meta">
        <span className="mi">📅 Criada em {fmtDate(p.data_criacao)}</span>
        <span className={'mi' + (overdue ? ' venc' : '')}>{overdue ? '⚠️' : '⏰'} Prazo: {fmtDate(p.prazo)}{overdue ? ' (vencido)' : ''}</span>
        {p.contato && <span className="mi">👤 {p.contato}</span>}
      </div>
      {p.observacoes && <div className="pend-obs">📝 {p.observacoes}</div>}
      <div className="pend-actions">
        <button className="btn btn-ghost btn-sm" onClick={onEdit}>✎ Editar</button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>🗑 Excluir</button>
        <span className={'prio-lbl ' + p.prioridade}>Prioridade {p.prioridade}</span>
      </div>
    </div>
  )
}

function PendModal({ fornecedor, pend, onClose, onDone, toast }) {
  const [f, setF] = useState(() => ({
    tipo: pend?.tipo || 'Proposta Comercial', prioridade: pend?.prioridade || 'Média',
    produto: pend?.produto || '', descricao: pend?.descricao || '', status: pend?.status || 'Aberta',
    prazo: pend?.prazo ? String(pend.prazo).slice(0, 10) : '', contato: pend?.contato || '', observacoes: pend?.observacoes || ''
  }))
  const [err, setErr] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  async function save() {
    if (!f.produto.trim()) { setErr(true); return }
    setSaving(true)
    try {
      if (pend) await api.updatePendencia(pend.id, f, pend.status === 'Resolvida')
      else await api.addPendencia(fornecedor.id, f)
      await onDone(pend ? '✓ Pendência atualizada' : '✓ Pendência criada')
    } catch (e) { setSaving(false); toast('⚠ ' + e.message) }
  }

  return (
    <Modal title={pend ? 'Editar Pendência' : 'Nova Pendência'} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvando...' : (pend ? 'Salvar Alterações' : 'Criar Pendência')}</button>
      </>}>
      <div className="sup-context">🏢 <span>{fornecedor.nome} — Classe {fornecedor.classe}</span></div>
      <div className="form-grid">
        <Field label="Tipo" req><select value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Prioridade" req><select value={f.prioridade} onChange={(e) => set('prioridade', e.target.value)}><option value="Alta">🔴 Alta</option><option value="Média">🟡 Média</option><option value="Baixa">🟢 Baixa</option></select></Field>
        <Field label="Produto / Assunto" req full>
          <input className={err ? 'err' : ''} value={f.produto} onChange={(e) => { set('produto', e.target.value); setErr(false) }} placeholder="Ex.: Vacina contra brucelose — lote 2026" />
        </Field>
        <Field label="Descrição" full><textarea value={f.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Detalhes da proposta ou negociação..." /></Field>
        <Field label="Status" req><select value={f.status} onChange={(e) => set('status', e.target.value)}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Prazo / Follow-up"><input type="date" value={f.prazo} onChange={(e) => set('prazo', e.target.value)} /></Field>
        <Field label="Contato no laboratório" full><input value={f.contato} onChange={(e) => set('contato', e.target.value)} placeholder="Ex.: João Silva — (18) 99999-9999" /></Field>
        <Field label="Observações / Histórico" full><textarea value={f.observacoes} onChange={(e) => set('observacoes', e.target.value)} placeholder="Anotações adicionais..." /></Field>
      </div>
    </Modal>
  )
}

function SupModal({ fornecedor, onClose, onDone, toast }) {
  const [nome, setNome] = useState(fornecedor?.nome || '')
  const [classe, setClasse] = useState(fornecedor?.classe || 'A')
  const [err, setErr] = useState(false)
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!nome.trim()) { setErr(true); return }
    setSaving(true)
    try {
      if (fornecedor) await api.updateFornecedor(fornecedor.id, { nome: nome.trim(), classe })
      else await api.addFornecedor({ nome: nome.trim(), classe })
      await onDone(fornecedor ? '✓ Fornecedor atualizado' : '✓ Fornecedor adicionado')
    } catch (e) { setSaving(false); toast('⚠ ' + e.message) }
  }
  return (
    <Modal small title={fornecedor ? 'Editar Fornecedor' : 'Adicionar Fornecedor'} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Salvando...' : (fornecedor ? 'Salvar Alterações' : 'Adicionar')}</button>
      </>}>
      <Field label="Nome do fornecedor" req>
        <input className={err ? 'err' : ''} value={nome} onChange={(e) => { setNome(e.target.value); setErr(false) }} placeholder="Razão social do laboratório / fornecedor" />
      </Field>
      <Field label="Classe" req>
        <select value={classe} onChange={(e) => setClasse(e.target.value)}>
          <option value="A">Classe A — Principal</option>
          <option value="B">Classe B — Intermediário</option>
          <option value="C">Classe C — Eventual</option>
        </select>
      </Field>
      <span className="hint">{fornecedor ? 'Altere o nome e/ou a classe do fornecedor.' : 'O novo fornecedor será adicionado ao final da lista.'}</span>
    </Modal>
  )
}

function Field({ label, req, full, children }) {
  return (
    <div className={'field' + (full ? ' full' : '')}>
      <label>{label} {req && <span className="req">*</span>}</label>
      {children}
    </div>
  )
}
