/**
 * Dados cadastrais e fiscais da empresa (singleton no backend).
 *
 * Separado de `branding.ts` de propósito: branding é aparência e muda com a
 * estação; empresa é quem a loja é perante o cliente e o fisco.
 */
export type RegimeTributario = "simples" | "presumido" | "real" | "mei" | "";

export interface Empresa {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  regime_tributario: RegimeTributario;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  whatsapp: string;
  email: string;
  site: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  horario_funcionamento: string;
  /** Endereço já formatado numa linha (read-only, vem do backend). */
  endereco_linha?: string;
  /** Tem o mínimo para recibo/NF-e? (read-only) */
  esta_completa?: boolean;
  updated_at?: string;
}

/** Campos que o formulário envia — os derivados ficam de fora. */
export type EmpresaForm = Omit<
  Empresa,
  "endereco_linha" | "esta_completa" | "updated_at"
>;

export const EMPRESA_VAZIA: EmpresaForm = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  inscricao_estadual: "",
  inscricao_municipal: "",
  regime_tributario: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  telefone: "",
  whatsapp: "",
  email: "",
  site: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  horario_funcionamento: "",
};

export interface ConsultaCep {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface ConsultaCnpj extends ConsultaCep {
  razao_social: string;
  nome_fantasia: string;
  email: string;
  telefone: string;
  numero: string;
  complemento: string;
  situacao_cadastral: string;
  atividade_principal: string;
}

// --- Máscaras (formatação enquanto digita) --------------------------------

export function mascaraCnpj(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function mascaraCep(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function mascaraTelefone(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
