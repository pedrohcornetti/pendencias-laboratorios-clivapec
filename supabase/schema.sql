-- ============================================================
-- Clivapec — Estrutura do banco de dados (Supabase / PostgreSQL)
-- Cole TODO este conteúdo no Supabase: SQL Editor > New query > Run
-- ============================================================

-- ---------- TABELAS ----------

create table if not exists public.fornecedores (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  classe      text not null default 'A' check (classe in ('A','B','C')),
  ordem       integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.pendencias (
  id             uuid primary key default gen_random_uuid(),
  fornecedor_id  uuid not null references public.fornecedores(id) on delete cascade,
  tipo           text,
  produto        text,
  descricao      text,
  prioridade     text,
  status         text,
  prazo          date,
  contato        text,
  observacoes    text,
  data_criacao   timestamptz not null default now(),
  data_resolucao date
);

create table if not exists public.rebate_labs (
  id             uuid primary key default gen_random_uuid(),
  fornecedor_id  uuid references public.fornecedores(id) on delete set null,
  nome           text not null,
  classe         text,
  observacao     text,
  created_at     timestamptz not null default now()
);

create table if not exists public.rebate_metas (
  id              uuid primary key default gen_random_uuid(),
  lab_id          uuid not null references public.rebate_labs(id) on delete cascade,
  inicio          date,
  fim             date,
  percentual      numeric,
  compra_periodo  numeric,
  observacao      text,
  created_at      timestamptz not null default now()
);

create table if not exists public.rebate_recebimentos (
  id          uuid primary key default gen_random_uuid(),
  meta_id     uuid not null references public.rebate_metas(id) on delete cascade,
  valor       numeric not null default 0,
  data        date,
  observacao  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.premiacoes (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  laboratorio  text,
  inicio       date,
  fim          date,
  premio       text,
  meta         text,
  regras       text,
  observacoes  text,
  financeiro   text not null default 'Não apurado',
  foto_path    text,
  created_at   timestamptz not null default now()
);

-- Índices úteis
create index if not exists idx_pendencias_fornecedor on public.pendencias(fornecedor_id);
create index if not exists idx_metas_lab on public.rebate_metas(lab_id);
create index if not exists idx_recebimentos_meta on public.rebate_recebimentos(meta_id);

-- ---------- SEGURANÇA (RLS) ----------
-- Liga o Row Level Security e permite acesso completo a usuários LOGADOS.

alter table public.fornecedores         enable row level security;
alter table public.pendencias           enable row level security;
alter table public.rebate_labs          enable row level security;
alter table public.rebate_metas         enable row level security;
alter table public.rebate_recebimentos  enable row level security;
alter table public.premiacoes           enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'fornecedores','pendencias','rebate_labs','rebate_metas','rebate_recebimentos','premiacoes'
  ] loop
    execute format('drop policy if exists "acesso_logado" on public.%I;', t);
    execute format(
      'create policy "acesso_logado" on public.%I for all to authenticated using (true) with check (true);', t
    );
  end loop;
end$$;

-- ---------- STORAGE (fotos das apurações) ----------
-- 1) Crie o bucket pela interface: Storage > New bucket
--    Nome: apuracoes   |   marque "Public bucket"
-- 2) Depois rode as políticas abaixo (já valem para o bucket "apuracoes"):

drop policy if exists "apuracoes_leitura_publica" on storage.objects;
create policy "apuracoes_leitura_publica"
  on storage.objects for select
  using (bucket_id = 'apuracoes');

drop policy if exists "apuracoes_envio_logado" on storage.objects;
create policy "apuracoes_envio_logado"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'apuracoes');

drop policy if exists "apuracoes_update_logado" on storage.objects;
create policy "apuracoes_update_logado"
  on storage.objects for update to authenticated
  using (bucket_id = 'apuracoes');

drop policy if exists "apuracoes_delete_logado" on storage.objects;
create policy "apuracoes_delete_logado"
  on storage.objects for delete to authenticated
  using (bucket_id = 'apuracoes');

-- Pronto! Volte para o app, faça login e os fornecedores serão cadastrados
-- automaticamente na primeira vez (lista padrão de 130 laboratórios).
