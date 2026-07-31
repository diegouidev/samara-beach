# Samara Beach — Painel Interno (admin)

Painel de gestão da loja (Next.js). Consome a API Django (DRF), autenticado por
JWT de usuário **interno**. Roda na porta **3001**.

## Requisitos
- Node.js 20 LTS (neste ambiente WSL1: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 20`)
- Backend rodando em `http://localhost:8000`

## Rodando
```bash
cp .env.example .env.local
npm install
npm run dev      # http://localhost:3001
```

## Acesso
Usuários criados pelo `seed_demo` do backend (senha `senha12345`):
- admin@samarabeach.com — **admin** (acesso total)
- estoque@samarabeach.com — **estoque** (produtos, estoque, fornecedores)
- financeiro@samarabeach.com — **financeiro** (dashboard, margem, fornecedores)
- atendimento@samarabeach.com — **atendimento** (dashboard, pedidos)

Clientes (tipo `cliente`) **não** conseguem entrar no painel.

## Seções (visibilidade por papel)
- **Dashboard** — vendas, ticket médio, mais vendidos, alertas de estoque baixo
- **Produtos** — CRUD de produtos e variações + **upload de imagens**
- **Estoque** — registrar movimentação (entrada/saída/ajuste) e ver alertas
- **Pedidos** — lista e transição de status (baixa estoque no backend)
- **Fornecedores** — cadastro
- **Margem** — relatório de margem (produção própria vs. revenda)

## Estrutura
```
app/
  login/page.tsx
  (painel)/
    layout.tsx            # Sidebar + RequireAuth
    dashboard/            estoque/  pedidos/  fornecedores/  margem/
    produtos/            (lista, novo, [slug] com variações + imagens)
components/ (ui, layout, produtos)
lib/api.ts               # client JWT interno
providers/AuthProvider.tsx  # guarda de papel (só internos)
```
