import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// true quando o .env já está preenchido com um projeto real
export const supabaseConfigured = Boolean(
  url && key && !url.includes('SEU-PROJETO') && key !== 'cole-aqui-a-sua-anon-public-key'
)

export const supabase = supabaseConfigured ? createClient(url, key) : null
