import { supabase } from '../supabaseClient'
import { seedFornecedores } from './seedData'

const FOTO_BUCKET = 'apuracoes'

function check({ data, error }) {
  if (error) throw error
  return data
}

// ----------------- CARGA GERAL -----------------
export async function loadAll() {
  const [forn, pend, labs, metas, recs, prem] = await Promise.all([
    supabase.from('fornecedores').select('*').order('ordem', { ascending: true }),
    supabase.from('pendencias').select('*'),
    supabase.from('rebate_labs').select('*'),
    supabase.from('rebate_metas').select('*'),
    supabase.from('rebate_recebimentos').select('*'),
    supabase.from('premiacoes').select('*')
  ])

  const fornecedores = check(forn)
  const pendencias = check(pend)
  const rebateLabs = check(labs)
  const metasRows = check(metas)
  const recsRows = check(recs)
  const premiacoes = check(prem)

  fornecedores.forEach((f) => {
    f.pendencias = pendencias.filter((p) => p.fornecedor_id === f.id)
  })
  metasRows.forEach((m) => {
    m.recebimentos = recsRows.filter((r) => r.meta_id === m.id)
  })
  rebateLabs.forEach((l) => {
    l.metas = metasRows.filter((m) => m.lab_id === l.id)
  })

  return { fornecedores, rebateLabs, premiacoes }
}

// Cadastra a lista padrão de fornecedores se a tabela estiver vazia.
export async function ensureSeed() {
  const { count, error } = await supabase
    .from('fornecedores')
    .select('id', { count: 'exact', head: true })
  if (error) throw error
  if ((count || 0) > 0) return false
  const rows = seedFornecedores()
  check(await supabase.from('fornecedores').insert(rows))
  return true
}

// ----------------- FORNECEDORES -----------------
export async function nextOrdem() {
  const { data, error } = await supabase
    .from('fornecedores')
    .select('ordem')
    .order('ordem', { ascending: false })
    .limit(1)
  if (error) throw error
  return (data && data[0] ? data[0].ordem : 0) + 1
}

export async function addFornecedor({ nome, classe }) {
  const ordem = await nextOrdem()
  return check(await supabase.from('fornecedores').insert({ nome, classe, ordem }).select())
}

export async function updateFornecedor(id, { nome, classe }) {
  return check(await supabase.from('fornecedores').update({ nome, classe }).eq('id', id))
}

export async function deleteFornecedor(id) {
  return check(await supabase.from('fornecedores').delete().eq('id', id))
}

// ----------------- PENDÊNCIAS -----------------
export async function addPendencia(fornecedor_id, d) {
  const row = {
    fornecedor_id,
    tipo: d.tipo, produto: d.produto, descricao: d.descricao,
    prioridade: d.prioridade, status: d.status,
    prazo: d.prazo || null, contato: d.contato, observacoes: d.observacoes,
    data_resolucao: d.status === 'Resolvida' ? d.data_resolucao || todayShort() : null
  }
  return check(await supabase.from('pendencias').insert(row))
}

export async function updatePendencia(id, d, eraResolvida) {
  const row = {
    tipo: d.tipo, produto: d.produto, descricao: d.descricao,
    prioridade: d.prioridade, status: d.status,
    prazo: d.prazo || null, contato: d.contato, observacoes: d.observacoes
  }
  if (d.status === 'Resolvida') row.data_resolucao = eraResolvida ? d.data_resolucao || todayShort() : todayShort()
  else row.data_resolucao = null
  return check(await supabase.from('pendencias').update(row).eq('id', id))
}

export async function deletePendencia(id) {
  return check(await supabase.from('pendencias').delete().eq('id', id))
}

// ----------------- REBATE: LABS -----------------
export async function addLab({ fornecedor_id, nome, classe, observacao }) {
  return check(await supabase.from('rebate_labs').insert({ fornecedor_id, nome, classe, observacao }))
}
export async function updateLab(id, { observacao }) {
  return check(await supabase.from('rebate_labs').update({ observacao }).eq('id', id))
}
export async function deleteLab(id) {
  return check(await supabase.from('rebate_labs').delete().eq('id', id))
}

// ----------------- REBATE: METAS -----------------
export async function addMeta(lab_id, d) {
  const row = {
    lab_id, inicio: d.inicio || null, fim: d.fim || null,
    percentual: d.percentual, compra_periodo: d.compra_periodo, observacao: d.observacao
  }
  return check(await supabase.from('rebate_metas').insert(row))
}
export async function updateMeta(id, d) {
  const row = {
    inicio: d.inicio || null, fim: d.fim || null,
    percentual: d.percentual, compra_periodo: d.compra_periodo, observacao: d.observacao
  }
  return check(await supabase.from('rebate_metas').update(row).eq('id', id))
}
export async function deleteMeta(id) {
  return check(await supabase.from('rebate_metas').delete().eq('id', id))
}

// ----------------- REBATE: RECEBIMENTOS -----------------
export async function addRecebimento(meta_id, d) {
  return check(await supabase.from('rebate_recebimentos').insert({
    meta_id, valor: d.valor, data: d.data || null, observacao: d.observacao
  }))
}
export async function deleteRecebimento(id) {
  return check(await supabase.from('rebate_recebimentos').delete().eq('id', id))
}

// ----------------- PREMIAÇÕES -----------------
export async function addPremiacao(d) {
  return check(await supabase.from('premiacoes').insert(cleanPrem(d)).select())
}
export async function updatePremiacao(id, d) {
  return check(await supabase.from('premiacoes').update(cleanPrem(d)).eq('id', id))
}
export async function deletePremiacao(id) {
  return check(await supabase.from('premiacoes').delete().eq('id', id))
}
function cleanPrem(d) {
  return {
    titulo: d.titulo, laboratorio: d.laboratorio,
    inicio: d.inicio || null, fim: d.fim || null,
    premio: d.premio, meta: d.meta, regras: d.regras, observacoes: d.observacoes,
    financeiro: d.financeiro, foto_path: d.foto_path || null
  }
}

// ----------------- STORAGE (fotos) -----------------
export async function uploadFoto(blob) {
  const path = `apuracao-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await supabase.storage.from(FOTO_BUCKET).upload(path, blob, {
    contentType: 'image/jpeg', upsert: false
  })
  if (error) throw error
  return path
}
export function fotoUrl(path) {
  if (!path) return null
  return supabase.storage.from(FOTO_BUCKET).getPublicUrl(path).data.publicUrl
}
export async function deleteFoto(path) {
  if (!path) return
  await supabase.storage.from(FOTO_BUCKET).remove([path])
}

function todayShort() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
