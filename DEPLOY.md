# Deploy — VPS Hostinger + Cloudflare Tunnel

Guia para subir o Samara Beach em produção numa VPS, exposto por um subdomínio
via **Cloudflare Tunnel** (sem abrir portas na VPS, TLS gerenciado pela Cloudflare).

Arquitetura em produção:

```
Internet (HTTPS)
   │
   ▼
Cloudflare  ──(túnel de saída)──►  cloudflared (container)
                                        │  http://proxy:80
                                        ▼
                                     Caddy (proxy)
                    ┌──────────────┬───────────┬──────────────┐
                    ▼              ▼           ▼              ▼
                 storefront      admin       backend       /media, /django-static
                  (/  )        (/admin)    (/api, gunicorn)   (volumes)
```

> Você **não abre** as portas 80/443 na Hostinger. O `cloudflared` faz conexão
> de saída para a Cloudflare; o tráfego entra por dentro do túnel.

---

## Passo 0 — Identificar o tipo do seu tunnel

No painel da Cloudflare (**one.dash.cloudflare.com → Networks → Tunnels**):

- Se você criou pelo **dashboard**, o tunnel aparece como **"Remotely-managed"**
  e existe um botão **"Configure"** que mostra um **token** (string longa
  começando com `eyJ...`). ✅ **É este o modo que usamos.** Copie o token.
- Se aparece **"Locally-managed"**, foi criado via CLI (`cloudflared tunnel
  create`) e usa um arquivo de credenciais. Dá para migrar para token no
  dashboard, ou me avise que ajusto o compose para esse modo.

Guarde o **token** — vai no `.env` como `TUNNEL_TOKEN`.

---

## Passo 1 — Enviar o código para a VPS

Na VPS (Docker já instalado), clone o repositório:

```bash
cd ~
git clone git@github.com:diegouidev/samara-beach.git
cd samara-beach
```

> Se a VPS não tiver a chave SSH do GitHub, use HTTPS:
> `git clone https://github.com/diegouidev/samara-beach.git`

---

## Passo 2 — Configurar o `.env` de produção

```bash
cp backend/.env.prod.example backend/.env
nano backend/.env
```

Preencha (troque **todos** os `TROQUE-...`):

| Variável | Valor |
|---|---|
| `DJANGO_SECRET_KEY` | uma chave longa e aleatória (gere: `python -c "import secrets;print(secrets.token_urlsafe(64))"`) |
| `DJANGO_ALLOWED_HOSTS` | `SEU-SUBDOMINIO.seudominio.com,proxy,backend,localhost` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://SEU-SUBDOMINIO.seudominio.com` |
| `POSTGRES_PASSWORD` | uma senha forte |
| `CORS_ALLOWED_ORIGINS` | `https://SEU-SUBDOMINIO.seudominio.com` |
| `TUNNEL_TOKEN` | o token do Passo 0 |

`DJANGO_SETTINGS_MODULE` já vem como `config.settings.prod` e `DJANGO_DEBUG=False`.

---

## Passo 3 — Rotear o subdomínio para o proxy (no dashboard da Cloudflare)

No tunnel, aba **Public Hostnames → Add a public hostname**:

- **Subdomain**: o subdomínio que você quer (ex.: `loja`)
- **Domain**: seu domínio
- **Service · Type**: `HTTP`
- **Service · URL**: `proxy:80`

Salve. Isso faz `https://loja.seudominio.com` chegar no Caddy, que distribui
para loja (`/`), painel (`/admin`) e API (`/api`).

> Um único public hostname cobre tudo. O painel fica em
> `https://loja.seudominio.com/admin`.

---

## Passo 4 — Subir a stack (um comando)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile tunnel up -d --build
```

Isso sobe **8 serviços**: db, redis, backend (gunicorn), celery, storefront,
admin, proxy (Caddy) e cloudflared. Na primeira subida o backend roda
`migrate` + `collectstatic` automaticamente.

Acompanhe:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f cloudflared
# deve mostrar "Registered tunnel connection" — o túnel está no ar.
```

---

## Passo 5 — Criar usuários e dados iniciais

```bash
CP="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

# Superusuário admin do painel (interno):
$CP exec backend python manage.py createsuperuser

# OU popular dados de demonstração (categorias, produtos, usuários por papel):
$CP exec backend python manage.py seed_demo
```

Acesse **https://SEU-SUBDOMINIO.seudominio.com** (loja) e
**https://SEU-SUBDOMINIO.seudominio.com/admin** (painel).

---

## Operação do dia a dia

```bash
CP="docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile tunnel"

# Atualizar após um git pull:
git pull
$CP up -d --build

# Ver logs / status:
$CP ps
$CP logs -f backend

# Parar tudo:
$CP down
```

### Backup do banco
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec db \
  pg_dump -U samarabeach samarabeach > backup_$(date +%F).sql
```

---

## Solução de problemas

| Sintoma | Causa provável | Correção |
|---|---|---|
| Loop de redirect / "too many redirects" | SSL redirect duplicado | Já tratado: `prod.py` **não** força `SECURE_SSL_REDIRECT`. Confirme que está usando `config.settings.prod`. |
| 403 CSRF no Django admin ou ao salvar | domínio fora de `CSRF_TRUSTED_ORIGINS` | Adicione `https://SEU-SUBDOMINIO...` em `DJANGO_CSRF_TRUSTED_ORIGINS` e recrie o backend. |
| `DisallowedHost` / 400 | domínio fora de `ALLOWED_HOSTS` | Inclua o subdomínio em `DJANGO_ALLOWED_HOSTS`. |
| CSS do admin sem estilo | static não coletado | O start roda `collectstatic`; veja logs do backend. |
| cloudflared não conecta | token errado/ausente | Confira `TUNNEL_TOKEN` no `backend/.env`. |
| Imagens de produto não aparecem | volume de media | Elas ficam no volume `media`; persiste entre deploys. |

## Segurança
- `backend/.env` **não** vai para o Git (está no `.gitignore`). Configure-o
  direto na VPS.
- Portas de Postgres/Redis/backend **não** são expostas ao host em produção —
  só o túnel entra.
```
