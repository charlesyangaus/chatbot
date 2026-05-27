-- Run in Supabase Dashboard → SQL Editor (or via Supabase CLI).
-- Enables pgvector and tables/functions for RAG.

create extension if not exists vector;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists documents_embedding_hnsw_idx
  on public.documents
  using hnsw (embedding vector_cosine_ops);

comment on table public.documents is 'RAG knowledge chunks with embeddings (text-embedding-3-small, 1536 dims)';

create or replace function public.match_documents(
  query_embedding vector(1536),
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  select
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  where d.embedding is not null
    and 1 - (d.embedding <=> query_embedding) > match_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- Optional: lock down direct client access; server uses service role key.
alter table public.documents enable row level security;
