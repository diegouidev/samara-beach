"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import { formatDataHora } from "@/lib/format";
import type {
  NivelAuditoria,
  RegistroAuditoria,
  ResumoAuditoria,
  UsuarioInterno,
} from "@/lib/types";
import {
  Alerta,
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  Stat,
  inputClass,
} from "@/components/ui";
import { RequireAuth } from "@/components/layout/RequireAuth";

export default function AuditoriaPage() {
  return (
    <RequireAuth papeis={["admin"]}>
      <AuditoriaContent />
    </RequireAuth>
  );
}

const TONE_NIVEL: Record<NivelAuditoria, "neutral" | "amber" | "red"> = {
  info: "neutral",
  atencao: "amber",
  critico: "red",
};

/** Agrupadas por assunto — a lista crua de 20 ações fica difícil de varrer. */
const ACOES = [
  { grupo: "Dinheiro", opcoes: [
    ["venda", "Venda no PDV"],
    ["cancelamento_venda", "Cancelamento de venda"],
    ["devolucao", "Devolução"],
    ["abertura_caixa", "Abertura de caixa"],
    ["fechamento_caixa", "Fechamento de caixa"],
    ["sangria", "Sangria"],
    ["suprimento", "Suprimento"],
    ["pagamento_conta", "Baixa de conta"],
  ]},
  { grupo: "Estoque e preço", opcoes: [
    ["ajuste_estoque", "Ajuste de estoque"],
    ["alteracao_preco", "Alteração de preço"],
    ["mudanca_status", "Mudança de status"],
  ]},
  { grupo: "Acesso", opcoes: [
    ["login", "Login"],
    ["logout", "Logout"],
    ["reset_senha", "Redefinição de senha"],
    ["mudanca_papel", "Mudança de papel"],
    ["desativar_usuario", "Desativação de usuário"],
    ["reativar_usuario", "Reativação de usuário"],
  ]},
  { grupo: "Cadastros", opcoes: [
    ["criar", "Criação"],
    ["atualizar", "Alteração"],
    ["excluir", "Exclusão"],
  ]},
] as const;

/** Últimos 7 dias por padrão: abrir com a base inteira não ajuda ninguém. */
function seteDiasAtras(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function AuditoriaContent() {
  const [dados, setDados] = useState<RegistroAuditoria[]>([]);
  const [total, setTotal] = useState(0);
  const [resumo, setResumo] = useState<ResumoAuditoria | null>(null);
  const [equipe, setEquipe] = useState<UsuarioInterno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<RegistroAuditoria | null>(null);

  const [busca, setBusca] = useState("");
  const [usuario, setUsuario] = useState("");
  const [acao, setAcao] = useState("");
  const [nivel, setNivel] = useState("");
  const [inicio, setInicio] = useState(seteDiasAtras);
  const [fim, setFim] = useState("");
  const [pagina, setPagina] = useState(1);

  const params = useMemo(() => {
    const p: Record<string, string> = { page: String(pagina) };
    if (busca) p.search = busca;
    if (usuario) p.usuario = usuario;
    if (acao) p.acao = acao;
    if (nivel) p.nivel = nivel;
    if (inicio) p.inicio = inicio;
    if (fim) p.fim = fim;
    return p;
  }, [busca, usuario, acao, nivel, inicio, fim, pagina]);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(null);
    api
      .listarAuditoria(params)
      .then((r) => {
        setDados(r.results);
        setTotal(r.count);
      })
      .catch((e) =>
        setErro(e instanceof Error ? e.message : "Erro ao carregar a trilha."),
      )
      .finally(() => setCarregando(false));
  }, [params]);

  useEffect(carregar, [carregar]);

  useEffect(() => {
    api.resumoAuditoria().then(setResumo).catch(() => setResumo(null));
    api
      .listarUsuariosInternos({ ativo: "true" })
      .then((r) => setEquipe(r.results))
      .catch(() => setEquipe([]));
  }, []);

  // Qualquer filtro novo volta para a primeira página.
  useEffect(() => setPagina(1), [busca, usuario, acao, nivel, inicio, fim]);

  const temFiltro = Boolean(busca || usuario || acao || nivel || fim) ||
    inicio !== seteDiasAtras();
  const totalPaginas = Math.max(1, Math.ceil(total / 20));

  function limpar() {
    setBusca("");
    setUsuario("");
    setAcao("");
    setNivel("");
    setInicio(seteDiasAtras());
    setFim("");
  }

  return (
    <div>
      <PageHeader
        title="Auditoria"
        subtitle="Quem alterou o quê, e quando — estoque, preço, caixa e acessos"
      />

      {erro && <Alerta tone="erro">{erro}</Alerta>}

      {resumo && (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <Stat label="Ações hoje" value={String(resumo.acoes_hoje)} />
          <Stat
            label="Críticas nos últimos 7 dias"
            value={String(resumo.criticas_semana)}
            tone={resumo.criticas_semana > 0 ? "atencao" : "neutral"}
          />
          <Stat
            label="Pessoas ativas hoje"
            value={String(resumo.usuarios_hoje)}
          />
        </div>
      )}

      <Card bare>
        <div className="flex flex-wrap items-end gap-3 p-4">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar na descrição, objeto ou e-mail…"
            className={`${inputClass} sm:w-64`}
          />
          <select
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className={`${inputClass} sm:w-44`}
          >
            <option value="">Todo mundo</option>
            {equipe.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome_exibicao}
              </option>
            ))}
          </select>
          <select
            value={acao}
            onChange={(e) => setAcao(e.target.value)}
            className={`${inputClass} sm:w-52`}
          >
            <option value="">Todas as ações</option>
            {ACOES.map((g) => (
              <optgroup key={g.grupo} label={g.grupo}>
                {g.opcoes.map(([valor, label]) => (
                  <option key={valor} value={valor}>
                    {label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <select
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
            className={`${inputClass} sm:w-40`}
          >
            <option value="">Qualquer nível</option>
            <option value="critico">Crítico</option>
            <option value="atencao">Atenção</option>
            <option value="info">Informativo</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-panel-inkSoft">
            De
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className={`${inputClass} w-40`}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-panel-inkSoft">
            até
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className={`${inputClass} w-40`}
            />
          </label>
          {temFiltro && (
            <Button variant="ghost" onClick={limpar}>
              Limpar
            </Button>
          )}
        </div>

        {carregando ? (
          <EmptyState titulo="Carregando…" />
        ) : dados.length === 0 ? (
          <EmptyState
            titulo="Nenhum registro no período"
            descricao={
              temFiltro
                ? "Tente ampliar o período ou limpar os filtros."
                : "As ações da equipe aparecem aqui assim que acontecerem."
            }
          />
        ) : (
          <>
            <div className="tabela-wrap">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Quem</th>
                    <th>Ação</th>
                    <th>Sobre</th>
                    <th>O que aconteceu</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {dados.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap text-xs text-panel-inkMuted">
                        {formatDataHora(r.created_at)}
                      </td>
                      <td>
                        <p className="font-medium text-panel-ink">
                          {r.usuario_nome || r.usuario_email || "—"}
                        </p>
                        {r.usuario_email && (
                          <p className="text-xs text-panel-inkMuted">
                            {r.usuario_email}
                          </p>
                        )}
                      </td>
                      <td>
                        <Badge tone={TONE_NIVEL[r.nivel]}>{r.acao_label}</Badge>
                      </td>
                      <td className="max-w-[180px] truncate text-panel-inkSoft">
                        {r.objeto_repr || "—"}
                        {r.model_name && (
                          <span className="block text-xs text-panel-inkMuted">
                            {r.model_name}
                          </span>
                        )}
                      </td>
                      <td className="text-panel-inkSoft">{r.descricao || "—"}</td>
                      <td>
                        <Button
                          variant="ghost"
                          onClick={() => setDetalhe(r)}
                        >
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-panel-border px-4 py-3 text-sm text-panel-inkMuted">
              <span>
                {total} registro{total === 1 ? "" : "s"} · página {pagina} de{" "}
                {totalPaginas}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal
        aberto={detalhe !== null}
        titulo={detalhe?.acao_label ?? ""}
        subtitulo={detalhe ? formatDataHora(detalhe.created_at) : undefined}
        largura="max-w-xl"
        onFechar={() => setDetalhe(null)}
      >
        {detalhe && <DetalheRegistro registro={detalhe} />}
      </Modal>
    </div>
  );
}

/** Mostra o diff legível em vez do JSON cru. */
function DetalheRegistro({ registro }: { registro: RegistroAuditoria }) {
  const entradas = Object.entries(registro.dados ?? {});

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <Linha rotulo="Quem">
          {registro.usuario_nome || "—"}
          {registro.usuario_email && ` (${registro.usuario_email})`}
        </Linha>
        {registro.usuario_papel && (
          <Linha rotulo="Papel">{registro.usuario_papel}</Linha>
        )}
        {registro.objeto_repr && (
          <Linha rotulo="Objeto">{registro.objeto_repr}</Linha>
        )}
        {registro.ip && <Linha rotulo="IP">{registro.ip}</Linha>}
      </div>

      {registro.descricao && (
        <p className="rounded-xl bg-panel-surfaceMuted px-4 py-3 text-panel-ink">
          {registro.descricao}
        </p>
      )}

      {entradas.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-panel-inkMuted">
            Detalhes
          </p>
          <div className="space-y-1.5">
            {entradas.map(([campo, valor]) => (
              <ValorDetalhe key={campo} campo={campo} valor={valor} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Linha({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <p className="flex gap-2">
      <span className="w-20 flex-shrink-0 text-panel-inkMuted">{rotulo}</span>
      <span className="text-panel-ink">{children}</span>
    </p>
  );
}

/** `{de, para}` vira "antes → depois"; o resto cai em texto simples. */
function ValorDetalhe({ campo, valor }: { campo: string; valor: unknown }) {
  const ehDiff =
    valor !== null &&
    typeof valor === "object" &&
    "de" in (valor as object) &&
    "para" in (valor as object);

  if (ehDiff) {
    const { de, para } = valor as { de: unknown; para: unknown };
    return (
      <p className="flex flex-wrap items-center gap-2">
        <span className="w-32 flex-shrink-0 text-panel-inkMuted">{campo}</span>
        <span className="text-panel-inkMuted line-through">{String(de ?? "—")}</span>
        <span className="text-panel-inkMuted">→</span>
        <span className="font-medium text-panel-ink">{String(para ?? "—")}</span>
      </p>
    );
  }

  const texto =
    valor !== null && typeof valor === "object"
      ? JSON.stringify(valor)
      : String(valor ?? "—");

  return (
    <p className="flex flex-wrap gap-2">
      <span className="w-32 flex-shrink-0 text-panel-inkMuted">{campo}</span>
      <span className="text-panel-ink">{texto}</span>
    </p>
  );
}
