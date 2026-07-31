# Escopo Técnico — Sistema Interno + Loja Online (Moda Praia)

## 1. Visão Geral

Projeto composto por **3 aplicações independentes** que se comunicam via API:

1. **Backend (API)** — Django + Django REST Framework. Fonte única da verdade (produtos, estoque, pedidos, clientes, financeiro).
2. **Storefront** — Next.js. Loja online voltada ao cliente final (SSR/ISR para SEO e performance).
3. **Painel Interno (Admin)** — Next.js. Interface 100% custom para a equipe da loja gerenciar produtos, estoque, pedidos e financeiro (sem usar Django Admin).

```
                     ┌─────────────────────┐
                     │   Django REST API    │
                     │  (fonte da verdade)   │
                     └──────────┬───────────┘
                                │
                ┌───────────────┼───────────────┐
                │                               │
     ┌──────────▼─────────┐         ┌───────────▼──────────┐
     │  Next.js Storefront │         │  Next.js Painel Interno│
     │   (cliente final)   │         │  (equipe da loja)      │
     └──────────────────────┘         └────────────────────────┘
```

Autenticação: JWT (via `djangorestframework-simplejwt`), com escopos separados para clientes (storefront) e usuários internos (painel).

---

## 2. Modelagem de Dados (entidades principais)

### Catálogo
- **Categoria** (nome, slug, categoria_pai)
- **Produto** (nome, slug, descrição, categoria, tipo_origem: `producao_propria` | `revenda`, ativo, tags)
- **VariacaoProduto** (produto, cor, tamanho, SKU, preço, preço_promocional, peso/dimensões p/ frete)
- **ImagemProduto** (variação, url, ordem)
- **TabelaMedidas** (categoria ou produto, referência de medidas)

### Origem / Estoque
- **Fornecedor** (nome, contato, prazo médio de entrega)
- **PedidoCompraFornecedor** (fornecedor, itens, status, data prevista, custo total)
- **LoteProducao** (produto/variação, quantidade produzida, custo de produção, data)
- **MovimentacaoEstoque** (variação, tipo: entrada/saída/ajuste, origem: venda/produção/compra/devolução, quantidade, saldo resultante)

> Ambos os fluxos (produção própria e compra de fornecedor) alimentam a mesma `MovimentacaoEstoque`, o que permite relatório de margem por produto mesmo com origem mista.

### Clientes e Pedidos
- **Cliente** (usuário, nome, CPF, telefone)
- **Endereco** (cliente, tipo, logradouro, cidade, UF, CEP)
- **Pedido** (cliente, status, subtotal, frete, desconto, total, criado_em)
- **ItemPedido** (pedido, variação, quantidade, preço_unitário)
- **Pagamento** (pedido, gateway, status, valor, referência externa)
- **Envio** (pedido, transportadora, código_rastreio, status)
- **Cupom** (código, tipo: percentual/fixo, valor, validade, uso_máximo)
- **Avaliacao** (produto, cliente, nota, comentário)

### Interno
- **UsuarioInterno** (nome, papel: admin/estoque/financeiro/atendimento, permissões)
- **ContaPagar** (fornecedor, valor, vencimento, status) — controle financeiro básico

---

## 3. Módulos e Funcionalidades

### 3.1 Storefront (Next.js)

**MVP**
- Listagem e busca de produtos com filtros (categoria, tamanho, cor, preço)
- Página de produto com variações, galeria de imagens e tabela de medidas
- Carrinho persistente
- Checkout (Pix, cartão via gateway — ex: Mercado Pago ou Pagar.me)
- Cálculo de frete
- Cadastro/login de cliente, histórico de pedidos, endereços salvos
- E-mails transacionais (confirmação de pedido, envio)

**Fase 2**
- Lista de desejos
- Avaliações de produtos
- Cupons e promoções
- Newsletter / integração com e-mail marketing
- Recomendação de produtos relacionados

### 3.2 Painel Interno (Next.js)

**MVP**
- Login com papéis/permissões (admin, estoque, financeiro, atendimento)
- CRUD de produtos e variações (com upload de imagens)
- Gestão de estoque: registrar lote de produção OU pedido de compra a fornecedor, ver saldo por SKU, alertas de estoque baixo
- Gestão de pedidos: lista com status, atualização de status, dados de envio
- Cadastro de fornecedores
- Dashboard simples: vendas por período, produtos mais vendidos, ticket médio

**Fase 2**
- Emissão de NF-e (integração com serviço tipo Focus NFe/eNotas)
- Contas a pagar (fornecedores)
- Relatório de margem por produto (produção própria vs. revenda)
- Gestão de cupons e promoções
- Atendimento/tickets de suporte

### 3.3 Backend / API (Django + DRF)
- Apps sugeridos: `catalog`, `inventory`, `orders`, `customers`, `suppliers`, `payments`, `shipping`, `accounts` (usuários internos + clientes)
- Autenticação JWT com dois grupos de permissão (cliente vs. interno)
- Integração com gateway de pagamento (webhook de confirmação)
- Integração com cálculo de frete (API dos Correios ou Melhor Envio/Frenet)
- Celery + Redis para tarefas assíncronas: envio de e-mail, processamento de webhook de pagamento, geração de relatórios

---

## 4. Estrutura de Projeto Sugerida

Repositórios separados (recomendado, já que são 3 deploys independentes):

```
loja-praia-backend/       (Django + DRF)
  apps/
    catalog/
    inventory/
    orders/
    customers/
    suppliers/
    payments/
    shipping/
    accounts/
  config/                 (settings, urls, celery.py)
  docker-compose.yml
  Dockerfile

loja-praia-storefront/    (Next.js — cliente final)
  app/
  components/
  lib/api.ts              (client da API Django)

loja-praia-admin/         (Next.js — painel interno)
  app/
  components/
  lib/api.ts
```

---

## 5. Docker Compose (ambiente de desenvolvimento)

Recomendado desde o início, focado no backend (banco, cache, API); os frontends podem rodar via `npm run dev` fora do Docker no dia a dia, mas ficam disponíveis como serviços quando precisar do ambiente integrado.

Serviços sugeridos:
- `db` — Postgres
- `redis` — cache + broker do Celery
- `backend` — Django (API)
- `celery` — worker para tarefas assíncronas
- `storefront` (opcional, perfil separado)
- `admin` (opcional, perfil separado)

---

## 6. Roadmap Sugerido

1. **Fase 0** — Setup dos 3 repositórios, Docker Compose, modelagem inicial no Django, autenticação JWT
2. **Fase 1 (MVP)** — Catálogo + estoque + painel interno básico + storefront com checkout funcional
3. **Fase 2** — NF-e, financeiro, cupons, avaliações, relatórios de margem
4. **Fase 3** — Expansão (marketplaces, automações de marketing, etc.) — modelo de dados já preparado para isso
