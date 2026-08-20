/**
 * Kit de UI do painel.
 *
 * A base visual é: superfície branca sobre fundo cinza-claro, borda de 1px
 * bem clara, sombra curta e cantos generosos. Hierarquia vem de tipografia e
 * espaçamento — não de mais bordas.
 */
"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";

export function Card({
  children,
  className = "",
  title,
  subtitle,
  action,
  bare = false,
  id,
}: {
  children: ReactNode;
  className?: string;
  /** Âncora para rolagem (ex.: pular para um formulário). */
  id?: string;
  /** Cabeçalho opcional do bloco. */
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  /** `true` remove o padding interno (listas e tabelas coladas na borda). */
  bare?: boolean;
}) {
  return (
    <section
      id={id}
      className={`overflow-hidden rounded-2xl border border-panel-border bg-panel-surface shadow-card ${className}`}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-panel-border px-5 py-4">
          <div>
            {title && (
              <h2 className="font-semibold leading-tight text-panel-ink">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-panel-inkMuted">{subtitle}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={bare ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-panel-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-panel-inkMuted">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "neutral" | "accent" | "positivo" | "atencao";
  /** Quando informado, o card inteiro vira link para a tela que resolve o número. */
  href?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-500",
    accent: "bg-panel-accent/10 text-panel-accent",
    positivo: "bg-emerald-50 text-emerald-600",
    atencao: "bg-amber-50 text-amber-600",
  };

  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-panel-inkMuted">{label}</p>
        {icon && (
          <span
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="tabular mt-3 text-2xl font-semibold tracking-tight text-panel-ink">
        {value}
      </p>
      {hint && (
        <p className="mt-1 flex items-center gap-1 text-xs text-panel-inkMuted">
          {hint}
          {href && <span aria-hidden="true">→</span>}
        </p>
      )}
    </>
  );

  const base =
    "block rounded-2xl border border-panel-border bg-panel-surface p-5 shadow-card transition";

  if (href) {
    return (
      <Link
        href={href}
        className={`${base} hover:-translate-y-0.5 hover:border-panel-borderStrong hover:shadow-cardHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-panel-accent focus-visible:ring-offset-2`}
      >
        {conteudo}
      </Link>
    );
  }

  return <div className={`${base} hover:shadow-cardHover`}>{conteudo}</div>;
}

const BADGE_STYLES: Record<string, string> = {
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function Badge({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_STYLES;
  /** Ponto colorido à esquerda — bom para status. */
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${BADGE_STYLES[tone]}`}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      )}
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  disabled,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "outline" | "ghost" | "danger" | "soft";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-panel-accent text-white shadow-card hover:brightness-110 active:brightness-95",
    soft: "bg-panel-accent/10 text-panel-accent hover:bg-panel-accent/15",
    outline:
      "border border-panel-borderStrong bg-panel-surface text-panel-ink hover:border-panel-accent hover:text-panel-accent",
    ghost: "text-panel-inkSoft hover:bg-slate-100 hover:text-panel-ink",
    danger: "bg-red-500 text-white shadow-card hover:bg-red-600",
  };
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium
        transition focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-panel-accent/40 focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none
        ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-panel-inkSoft">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs text-panel-inkMuted">{hint}</span>}
    </label>
  );
}

/**
 * Modal centrado, com fundo escurecido, fecha no Esc e no clique fora.
 * O conteúdo rola sozinho quando é maior que a tela — formulários longos
 * não podem empurrar o rodapé para fora do alcance.
 */
export function Modal({
  aberto,
  titulo,
  subtitulo,
  onFechar,
  children,
  largura = "max-w-2xl",
}: {
  aberto: boolean;
  titulo: string;
  subtitulo?: string;
  onFechar: () => void;
  children: ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    // Trava a rolagem do fundo enquanto o modal está aberto.
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8"
      onClick={onFechar}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className={`animate-entrada my-auto w-full ${largura} overflow-hidden rounded-2xl bg-panel-surface shadow-pop`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-panel-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-panel-ink">{titulo}</h2>
            {subtitulo && (
              <p className="mt-0.5 text-sm text-panel-inkMuted">{subtitulo}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="-mr-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-panel-inkMuted transition hover:bg-slate-100 hover:text-panel-ink"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/** Estado vazio padrão — evita a "tabela vazia" seca. */
/**
 * Confirmação de ação destrutiva.
 *
 * Substitui o `confirm()` do navegador: mantém a linguagem do sistema, cabe
 * explicar o que se perde e o botão diz exatamente o que vai acontecer.
 */
export function ConfirmarExclusao({
  aberto,
  titulo,
  onFechar,
  onConfirmar,
  processando = false,
  rotuloConfirmar = "Excluir",
  children,
}: {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  onConfirmar: () => void;
  processando?: boolean;
  rotuloConfirmar?: string;
  /** O que se perde — escreva a consequência, não "tem certeza?". */
  children: ReactNode;
}) {
  return (
    <Modal aberto={aberto} titulo={titulo} largura="max-w-md" onFechar={onFechar}>
      <div className="text-sm leading-relaxed text-panel-inkSoft">{children}</div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onFechar} disabled={processando}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirmar} disabled={processando}>
          {processando ? "Excluindo…" : rotuloConfirmar}
        </Button>
      </div>
    </Modal>
  );
}

export function EmptyState({
  titulo,
  descricao,
  acao,
  icone,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  icone?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icone && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-panel-inkMuted">
          {icone}
        </span>
      )}
      <p className="font-medium text-panel-ink">{titulo}</p>
      {descricao && (
        <p className="mt-1 max-w-sm text-sm text-panel-inkMuted">{descricao}</p>
      )}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

/** Faixa de aviso (sucesso, erro, atenção). */
export function Alerta({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "sucesso" | "erro" | "atencao";
}) {
  const tones: Record<string, string> = {
    info: "bg-sky-50 text-sky-800 ring-sky-100",
    sucesso: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    erro: "bg-red-50 text-red-700 ring-red-100",
    atencao: "bg-amber-50 text-amber-800 ring-amber-100",
  };
  return (
    <p
      className={`mb-4 animate-entrada rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </p>
  );
}

export const inputClass =
  "h-10 w-full rounded-xl border border-panel-borderStrong bg-panel-surface px-3 " +
  "text-sm text-panel-ink placeholder:text-panel-inkMuted transition " +
  "focus:border-panel-accent focus:outline-none focus:ring-2 focus:ring-panel-accent/25 " +
  "disabled:bg-panel-surfaceMuted disabled:text-panel-inkMuted";

/** Mesma aparência do input, para <textarea> (altura livre). */
export const textareaClass =
  "w-full rounded-xl border border-panel-borderStrong bg-panel-surface px-3 py-2 " +
  "text-sm text-panel-ink placeholder:text-panel-inkMuted transition " +
  "focus:border-panel-accent focus:outline-none focus:ring-2 focus:ring-panel-accent/25";
