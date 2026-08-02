/** Máscaras de digitação para os formulários do painel (pt-BR). */

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** 00.000.000/0000-00 */
export function mascaraCNPJ(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** 000.000.000-00 */
export function mascaraCPF(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

/** 00000-000 */
export function mascaraCEP(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

/** (00) 0000-0000 ou (00) 00000-0000 */
export function mascaraTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

/** Slug de URL a partir de um texto livre (remove acentos). */
export function slugify(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function cnpjValido(valor: string): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;

  const digito = (base: string) => {
    const pesos = Array.from({ length: base.length }, (_, i) => {
      const p = base.length + 1 - i;
      return p <= 9 ? p : p - 8;
    });
    const soma = base
      .split("")
      .reduce((acc, n, i) => acc + Number(n) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? "0" : String(11 - resto);
  };

  return d[12] === digito(d.slice(0, 12)) && d[13] === digito(d.slice(0, 13));
}
