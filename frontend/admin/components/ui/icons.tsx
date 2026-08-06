/**
 * Ícones do painel — SVG inline (stroke, 1.6px) para não depender de
 * biblioteca e herdar a cor do texto via `currentColor`.
 */
import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconePainel = (p: Props) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Base>
);

export const IconeProduto = (p: Props) => (
  <Base {...p}>
    <path d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Z" />
    <path d="m4 6.5 8 4.5 8-4.5" />
    <path d="M12 11v9" />
  </Base>
);

export const IconeCategoria = (p: Props) => (
  <Base {...p}>
    <path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h8l8.6 8.6a2 2 0 0 1 0 2.8Z" />
    <circle cx="7.5" cy="7.5" r="1.2" />
  </Base>
);

export const IconeEstoque = (p: Props) => (
  <Base {...p}>
    <path d="M3 7h18v13H3z" />
    <path d="M3 7 5 3h14l2 4" />
    <path d="M9 12h6" />
  </Base>
);

export const IconePDV = (p: Props) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M7 8h4M7 12h10" />
    <path d="M2 20h20" />
  </Base>
);

export const IconeCaixa = (p: Props) => (
  <Base {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 12h.01M18 12h.01" />
  </Base>
);

export const IconeDevolucao = (p: Props) => (
  <Base {...p}>
    <path d="M3 9h13a5 5 0 0 1 0 10h-6" />
    <path d="m7 5-4 4 4 4" />
  </Base>
);

export const IconePedido = (p: Props) => (
  <Base {...p}>
    <path d="M6 2h9l4 4v16H6z" />
    <path d="M14 2v5h5" />
    <path d="M9.5 13.5h5M9.5 17h3" />
  </Base>
);

export const IconeCliente = (p: Props) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    <path d="M17 11.5a2.8 2.8 0 1 0-1.8-5" />
    <path d="M18 20c0-2.4-.9-4-2.4-4.9" />
  </Base>
);

export const IconeCupom = (p: Props) => (
  <Base {...p}>
    <path d="M3 9V7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a2.5 2.5 0 0 0 0 6v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a2.5 2.5 0 0 0 0-6Z" />
    <path d="M14 8.5v7" strokeDasharray="1.5 2.5" />
  </Base>
);

export const IconeEstrela = (p: Props) => (
  <Base {...p}>
    <path d="m12 3.5 2.7 5.5 6 .9-4.35 4.2 1.03 6-5.38-2.83L6.62 20l1.03-6L3.3 9.9l6-.9L12 3.5Z" />
  </Base>
);

export const IconeFornecedor = (p: Props) => (
  <Base {...p}>
    <path d="M2 8h11v9H2z" />
    <path d="M13 11h4.5l3 3.2V17H13z" />
    <circle cx="6.5" cy="18.5" r="1.8" />
    <circle cx="17" cy="18.5" r="1.8" />
  </Base>
);

export const IconeFinanceiro = (p: Props) => (
  <Base {...p}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
    <circle cx="12" cy="12" r="2.8" />
    <path d="M6 9v6M18 9v6" />
  </Base>
);

export const IconeMargem = (p: Props) => (
  <Base {...p}>
    <path d="M3 20h18" />
    <path d="M6 20v-6M11 20V8M16 20v-9M21 20V5" />
  </Base>
);

export const IconeEmpresa = (p: Props) => (
  <Base {...p}>
    <path d="M3 21h18" />
    <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
    <path d="M15 9h2a2 2 0 0 1 2 2v10" />
    <path d="M9 7h2M9 11h2M9 15h2" />
  </Base>
);

export const IconePaleta = (p: Props) => (
  <Base {...p}>
    <path d="M12 3a9 9 0 1 0 0 18 2 2 0 0 0 1.6-3.2 2 2 0 0 1 1.6-3.2H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z" />
    <circle cx="7.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="10.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
  </Base>
);

export const IconePerfil = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M4.5 20c0-3.6 3.3-6 7.5-6s7.5 2.4 7.5 6" />
  </Base>
);

export const IconeSair = (p: Props) => (
  <Base {...p}>
    <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
    <path d="M10 16l-4-4 4-4" />
    <path d="M6 12h9" />
  </Base>
);

export const IconeLink = (p: Props) => (
  <Base {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Base>
);

export const IconeBusca = (p: Props) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Base>
);

export const IconeAlerta = (p: Props) => (
  <Base {...p}>
    <path d="M12 3.5 2.8 19.5h18.4L12 3.5Z" />
    <path d="M12 10v4M12 17.2v.01" />
  </Base>
);

export const IconeMenu = (p: Props) => (
  <Base {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </Base>
);

export const IconeFechar = (p: Props) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
);
