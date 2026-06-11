# Publicar gratuitamente: Render + Neon

Esta configuração usa:

- Render Free para o site Next.js e a API.
- Neon Free para o PostgreSQL permanente.
- GitHub Free para armazenar o código.

## 1. Criar o banco no Neon

1. Entre em `https://neon.com` e crie uma conta.
2. Clique em **New Project**.
3. Use o nome `zenixblox` e escolha a região AWS mais próxima de Virgínia.
4. No painel do projeto, clique em **Connect**.
5. Deixe **Connection pooling** desativado.
6. Copie a URL exibida, sem `-pooler` no endereço.

Guarde essa URL:

- URL sem `-pooler`: será `DATABASE_URL`.

Ela deve conter `sslmode=require`. Caso o Neon ofereça `connect_timeout=15`, mantenha esse parâmetro.

## 2. Enviar o projeto ao GitHub

Crie um repositório vazio e privado no GitHub, sem adicionar README. No terminal desta pasta, execute:

```powershell
git add .
git commit -m "Preparar deploy gratuito"
git remote add origin https://github.com/SEU_USUARIO/zenix-blox.git
git push -u origin main
```

O `.env` não será enviado porque está no `.gitignore`.

## 3. Criar o serviço no Render

1. Entre em `https://render.com` usando sua conta do GitHub.
2. Clique em **New > Blueprint**.
3. Selecione o repositório `zenix-blox`.
4. O Render encontrará o arquivo `render.yaml`.
5. Preencha as variáveis solicitadas:

```env
DATABASE_URL=URL_DO_NEON_SEM_POOLER
SEED_ADMIN_EMAIL=email-do-dono@exemplo.com
SEED_ADMIN_PASSWORD=uma-senha-forte-e-exclusiva
```

O `AUTH_SECRET` será gerado automaticamente pelo Render. Não crie `SEED_DEMO_DATA` em produção.
O e-mail cria o administrador e a senha é sincronizada novamente a cada deploy.

## 4. Aguardar a publicação

Durante o primeiro deploy, o Render executará automaticamente:

1. Instalação das dependências.
2. Migrations no banco Neon.
3. Criação do admin e dos produtos iniciais.
4. Build e inicialização do Next.js.
5. Health check em `/api/health`.

Quando o status ficar **Live**, acesse:

- Roleta: `https://SEU-SERVICO.onrender.com`
- Admin: `https://SEU-SERVICO.onrender.com/admin`

## Atualizações futuras

Depois de alterar o código:

```powershell
git add .
git commit -m "Descrever a alteracao"
git push
```

O Render publica a atualização automaticamente. O banco Neon mantém produtos, imagens, keys e histórico.

## Limitações gratuitas

- O Render dorme depois de 15 minutos sem acessos.
- A primeira abertura depois disso pode levar aproximadamente um minuto.
- O Neon também suspende o processamento quando fica inativo, mas preserva os dados.
- Se os limites gratuitos forem excedidos, o serviço pode parar até a renovação do limite.
- Planos e limites podem mudar; confira os painéis antes de ativar qualquer opção paga.
