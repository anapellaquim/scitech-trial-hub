## Problema identificado

O usuário `aalmeida@scitechmed.com` **é** administrador (existe registro em `user_roles` com `role = 'admin'`) e a verificação `has_role` passa, então a rota `/admin/users` carrega sem redirect. Porém, a página fica vazia/sem usuários porque:

- A tabela `public.profiles` está **vazia** (0 linhas).
- A página `AdminUsers` lista usuários a partir de `profiles`, então não há nada para exibir nem para gerenciar permissões.
- A causa raiz é que a função `public.handle_new_user()` existe, mas **nenhum trigger** está conectado a `auth.users`. Por isso, nenhum perfil foi criado quando os usuários (incluindo o admin) se cadastraram.

Isso não é um problema de RLS — as policies de `profiles` e `user_roles` estão corretas e as funções `has_role` / `user_has_role_in_project` são `SECURITY DEFINER` (sem recursão).

## O que será feito

1. **Backfill de perfis existentes**
   - Criar uma linha em `public.profiles` para todo usuário em `auth.users` que ainda não tenha perfil, incluindo o administrador `aalmeida@scitechmed.com`.
   - Usar `raw_user_meta_data->>'full_name'` quando disponível, senão a parte antes do `@` do email como nome inicial.

2. **Garantir criação automática de perfil em novos cadastros**
   - Criar o trigger `on_auth_user_created` em `auth.users` que dispara `public.handle_new_user()` após cada `INSERT`.
   - Isso garante que qualquer novo usuário aparecerá automaticamente em Settings → Manage users.

3. **Robustez do `handle_new_user`**
   - Atualizar a função para tolerar duplicatas (`ON CONFLICT (id) DO NOTHING`) e usar fallback de nome (meta `full_name` → email local-part → "New User").
   - Mensagem padrão em inglês (alinhado à regra do projeto: "English (US) only").

## Detalhes técnicos (migration)

```sql
-- 1) Função robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      split_part(NEW.email, '@', 1),
      'New User'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

-- 2) Trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Backfill dos perfis ausentes
INSERT INTO public.profiles (id, full_name)
SELECT u.id,
       COALESCE(
         NULLIF(u.raw_user_meta_data->>'full_name',''),
         split_part(u.email,'@',1),
         'New User'
       )
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
```

## Resultado esperado

- Após a migration, `aalmeida@scitechmed.com` (e demais usuários existentes) aparecerão na lista em **Settings → Manage users & permissions**.
- O badge "Administrator" será exibido para o admin.
- O botão **Permissions** ficará acessível para configurar acessos por módulo.
- Novos cadastros gerarão perfil automaticamente.

Nenhuma alteração de código React é necessária — apenas a migration acima.
