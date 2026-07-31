# Samara Beach — Monorepo

E-commerce de moda praia. Monorepo com **backend** (API Django + DRF, fonte única
da verdade), **storefront** (loja Next.js) e **admin** (painel interno Next.js),
orquestrados por Docker Compose atrás de um proxy Caddy — tudo numa única origem.

## Estrutura do projeto
```
.
├── backend/               # API Django + DRF (apps/, config/, Dockerfile)
├── frontend/
│   ├── storefront/        # loja (Next.js, porta 3000)
│   └── admin/             # painel interno (Next.js, basePath /admin, porta 3001)
├── proxy/Caddyfile        # roteia / , /admin , /api , /media numa origem só
├── docker-compose.yml     # db, redis, backend, celery, storefront, admin, proxy, (cloudflared)
└── README.md
```

## Stack
- **Backend**: Django 5 + DRF, PostgreSQL 16, Redis + Celery, JWT, drf-spectacular
- **Frontends**: Next.js 15 (App Router) + TypeScript + Tailwind (tema dinâmico via branding)
- **Infra**: Docker Compose + Caddy (proxy HTTP). Produção via **Cloudflare Tunnel**.

## Subindo tudo com um comando

```bash
cp backend/.env.example backend/.env   # ajuste se necessário
docker compose up --build              # sobe os 6 serviços
```

As migrations rodam automaticamente no start do backend. Para popular dados demo:
```bash
docker compose exec backend python manage.py seed_demo
```

### Acesso (tudo em uma origem — porta 80)
| O quê | URL |
|---|---|
| 🛍️ Loja (storefront) | http://localhost/ |
| 🔧 Painel interno (admin) | http://localhost/admin |
| ⚙️ API + Swagger | http://localhost/api/docs/ |
| 🐍 Django admin | http://localhost/django-admin/ |

Login do painel (após `seed_demo`, senha `senha12345`): `admin@samarabeach.com`
(admin), `estoque@`, `financeiro@`, `atendimento@`. Cliente demo da loja:
`cliente@demo.com`.

> **Nota:** o proxy fica em HTTP na porta 80. O storefront chama a API na **mesma
> origem** (`/api`), e o SSR interno usa `http://backend:8000` (`API_URL_INTERNAL`).

## Produção com Cloudflare Tunnel
O TLS é terminado pelo Cloudflare; o proxy interno permanece em HTTP. Aponte um
único hostname (`samarabeach.com.br`) para o serviço `proxy:80` — cobre a loja,
o `/admin` e a `/api` de uma vez.

```bash
# no túnel do Cloudflare, configure o público → http://proxy:80
export CLOUDFLARE_TUNNEL_TOKEN=<seu-token>
docker compose --profile tunnel up -d      # sobe tudo + cloudflared
```
Ajustes recomendados para produção: `DJANGO_DEBUG=False`, `DJANGO_SECRET_KEY`
forte, `DJANGO_ALLOWED_HOSTS` com o domínio, e trocar o `runserver` do backend
por `gunicorn`.

## Personalização da marca (branding)
No painel, seção **Personalização** (papel admin): cores, logo, favicon e nome.
Salvo em `/api/branding/` e aplicado em runtime nos dois sites via CSS variables —
sem rebuild.

## Documentação da API
- Swagger UI: http://localhost/api/docs/  ·  ReDoc: `/api/redoc/`  ·  Schema: `/api/schema/`

## Autenticação (JWT)
- `POST /api/auth/token/` → `{ email, password }` → access + refresh + dados do usuário
- `POST /api/auth/token/refresh/`
- `POST /api/auth/logout/` → `{ refresh }` → invalida o refresh (blacklist)
- `GET  /api/auth/me/`

## Dados de demonstração
```bash
docker compose exec backend python manage.py seed_demo
```
Cria usuários internos por papel (admin/estoque/financeiro/atendimento),
um cliente, categorias, produtos/variações, estoque e o cupom `PROMO10`.
Senha padrão: `senha12345`.

## Testes
```bash
docker compose exec backend python -m pytest
```

## Principais endpoints
- **Catálogo** (leitura pública): `/api/produtos/`, `/api/categorias/`, `/api/variacoes/`, `/api/avaliacoes/`, ...
- **Estoque** (interno estoque/admin): `/api/lotes-producao/`, `/api/movimentacoes/`,
  `/api/movimentacoes/saldo/?variacao=<id>`, `/api/movimentacoes/estoque-baixo/`
- **Fornecedores** (interno): `/api/fornecedores/`, `/api/pedidos-compra/`, `/api/contas-pagar/` (financeiro/admin)
- **Clientes**: `/api/clientes/registro/` (público), `/api/clientes/eu/`, `/api/enderecos/`
- **Pedidos / carrinho**: `/api/pedidos/carrinho/`, `/api/pedidos/{id}/itens/`,
  `/api/pedidos/{id}/aplicar-cupom/`, `/api/pedidos/{id}/mudar-status/` (interno)
- **Relatórios** (interno): `/api/relatorios/dashboard/`, `/api/relatorios/margem/`

## Apps do backend (`backend/apps/`)
```
common/          BaseModel (UUID PK, timestamps, soft delete), permissões
accounts/        User customizado (cliente vs interno + papéis)
catalog/         Categoria, Produto, Variação, Imagem, TabelaMedidas, Avaliação
suppliers/       Fornecedor, PedidoCompra, ItemPedidoCompra, ContaPagar
inventory/       LoteProducao, MovimentacaoEstoque
customers/       Cliente, Endereco
orders/          Pedido, ItemPedido, Cupom
payments/        Pagamento
shipping/        Envio
reports/         dashboard + relatório de margem (sem models)
```

## Permissões (resumo)
- **Catálogo**: leitura pública; escrita para papel `estoque`/`admin`.
- **Estoque / Fornecedores**: apenas interno com papel `estoque`/`admin`.
- **Contas a pagar**: apenas interno com papel `financeiro`/`admin`.
