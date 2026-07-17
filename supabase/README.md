# Supabase

Este projeto usa migrations SQL versionadas em `supabase/migrations`.

## Variaveis de ambiente

No front-end use apenas:

```bash
VITE_SUPABASE_URL=https://rcxvibmjkccsanuvoeug.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_publishable_key
```

Nunca coloque `DATABASE_URL`, senha do banco, `service_role` ou `SUPABASE_SECRET_KEY` em arquivos versionados ou no front-end.

## Aplicar migrations

```bash
npx supabase login
npx supabase link --project-ref rcxvibmjkccsanuvoeug
npx supabase db push
```

Para desenvolvimento local:

```bash
npx supabase start
npx supabase db reset
```

## Reverter

Em producao, prefira criar uma nova migration compensatoria em vez de apagar migrations ja aplicadas. Antes de reverter, faca backup pelo painel da Supabase ou CLI.

Para reset local completo:

```bash
npx supabase db reset
```

## Gerar tipos TypeScript

Depois de aplicar o schema remoto, gere tipos atualizados com:

```bash
npx supabase gen types typescript --project-id rcxvibmjkccsanuvoeug --schema public > src/types/database.ts
```

O arquivo atual em `src/types/database.ts` foi criado junto da migration inicial e deve ser regenerado sempre que o schema mudar.
