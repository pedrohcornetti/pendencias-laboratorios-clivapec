export const todayISO = () => {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export const fmtDate = (s) => {
  if (!s) return '—'
  const d = String(s).slice(0, 10).split('-')
  if (d.length !== 3) return s
  return d[2] + '/' + d[1] + '/' + d[0]
}

export const fmtBRL = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const fmtPerc = (p) =>
  p == null ? '—' : Number(p).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%'

export const fmtNumInput = (n) =>
  Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const norm = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export const parseValor = (s) => {
  if (typeof s === 'number') return s
  let t = String(s || '').trim().replace(/[^\d.,-]/g, '')
  if (t.indexOf(',') > -1 && t.indexOf('.') > -1) t = t.replace(/\./g, '').replace(',', '.')
  else if (t.indexOf(',') > -1) t = t.replace(',', '.')
  const n = parseFloat(t)
  return isNaN(n) ? NaN : n
}

export const diffDays = (aISO, bISO) => {
  const a = new Date(aISO + 'T00:00:00'), b = new Date(bISO + 'T00:00:00')
  return Math.round((b - a) / 86400000)
}

export const weekStartISO = () => {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// converte "" para null (datas/numeros opcionais no banco)
export const orNull = (v) => (v === '' || v === undefined ? null : v)

// reduz/comprime imagem para data-base limitada antes de enviar ao Storage
export function compressImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let w = img.width, h = img.height
        if (w >= h && w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim }
        else if (h > w && h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('falha'))), 'image/jpeg', quality)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function downloadCSV(filename, headers, rows) {
  const cell = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'
  const csv = '﻿' + [headers].concat(rows).map((r) => r.map(cell).join(';')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
