# Supabase

Este projeto usa migrations SQL versionadas em `supabase/migrations`.

## Autenticacao da equipe

Clientes fazem pedidos sem criar conta. O Auth e reservado para proprietarios e funcionarios: o cadastro publico por e-mail e o login anonimo ficam desativados, e o acesso por senha exige e-mail confirmado e senha com pelo menos 10 caracteres, incluindo maiusculas, minusculas, numeros e simbolos.

No ambiente local, `supabase/config.toml` aplica essas regras ao iniciar ou reiniciar a stack local. Para criar acessos da equipe, um administrador deve convidar a pessoa pelo Dashboard em **Authentication > Users > Add user > Send invitation**. O convite confirma o e-mail e permite que a pessoa defina a senha. A criacao administrativa de usuarios tambem deve acontecer apenas no Dashboard ou em um servidor confiavel; nunca exponha uma chave secreta no navegador.

### Configuracao necessaria no Supabase hospedado

Alterar `config.toml` nao modifica as configuracoes do projeto remoto. Configure tambem o projeto `rcxvibmjkccsanuvoeug` no Dashboard Supabase:

1. Abra **Authentication > Sign In / Providers > Email** (o nome pode aparecer como **Authentication > Providers > Email**).
2. Desative **Allow new users to sign up** para impedir cadastro publico. Mantenha o provedor Email habilitado para que a equipe existente continue entrando.
3. Ative **Confirm email**. Convites enviados pelo administrador continuam sendo o fluxo para criar membros; a pessoa confirma pelo link recebido antes do primeiro login.
4. Em **Authentication > Settings** ou **Security and Protection > Password**, defina minimo de 10 caracteres e os requisitos de maiusculas, minusculas, numeros e simbolos, se essa opcao estiver disponivel no plano/tela.
5. Salve as alteracoes e confira em uma janela privada: o login de um membro confirmado deve funcionar e uma tentativa de cadastro publico deve ser recusada.

Esses ajustes do Dashboard sao remotos e precisam ser feitos e verificados separadamente. Nao copie senhas, tokens, chaves secretas ou credenciais para este arquivo. Se o SMTP personalizado ainda nao estiver configurado, confirme sua configuracao antes de depender de convites e mensagens de confirmacao; use um endereco valido e monitore a entrega.

## Variaveis de ambiente

No front-end use apenas:

```bash
VITE_SUPABASE_URL=https://rcxvibmjkccsanuvoeug.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_publishable_key
```

Nunca coloque `DATABASE_URL`, senha do banco, `service_role` ou `SUPABASE_SECRET_KEY` em arquivos versionados ou no front-end.

## Deploy protegido de pedidos

O checkout público deve usar a Edge Function `place-order`; o acesso direto ao RPC `place_order` por `anon` e `authenticated` é revogado pela migration de segurança. Estas etapas são administrativas e manuais: confira o projeto e as migrations pendentes antes de cada execução. Não rode `db push` sem revisar todas as pendências. Implante a função, aplique as migrations abaixo e publique o front-end logo em seguida. Pode haver breve interrupção entre revogar o RPC público e a Vercel servir o front-end atualizado.

```bash
npx supabase functions deploy place-order --project-ref rcxvibmjkccsanuvoeug
npx supabase migration list --linked
npx supabase db query --linked --file supabase/migrations/202610040900_harden_storage_write_policies.sql
npx supabase migration repair --linked --status applied 202610040900
npx supabase db query --linked --file supabase/migrations/202610041000_secure_public_order_creation.sql
npx supabase migration repair --linked --status applied 202610041000
npx supabase db query --linked --file supabase/migrations/202610041100_catalog_addons_are_authoritative.sql
npx supabase migration repair --linked --status applied 202610041100
npx supabase migration list --linked
```

Confira a lista antes e depois. Não use `db push` sem revisar todas as migrations pendentes: ele pode aplicar migrations antigas que não fazem parte desta mudança. Publique a atualização do site na Vercel depois de aplicar as migrations.

A função usa `SUPABASE_URL` e a chave de serviço fornecidas pelo runtime Supabase. Essa chave permanece no servidor e nunca deve ser adicionada a `VITE_*`, ao código do navegador ou ao Git. A cota é de 8 tentativas por IP a cada 15 minutos, por loja; o IP é armazenado como hash com chave. Confirme no Dashboard que a função foi implantada antes de testar um pedido real.

O banco também calcula preços a partir de produtos e adicionais ativos, exige área de entrega quando há zonas cadastradas, valida endereço, limita o pedido a 40 unidades e usa uma chave idempotente para evitar duplicação em repetição após timeout. A migration de catálogo vincula os adicionais e acréscimos apresentados no site às opções do Supabase. Até as migrations e a função serem aplicadas, não considere o checkout remoto validado.

Fotos públicas continuam legíveis, mas o upload da equipe exige um caminho no formato `<UUID-da-loja>/<arquivo>`. O aplicativo já usa esse formato após esta alteração.

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
