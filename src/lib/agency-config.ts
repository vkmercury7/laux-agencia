export const agencyConfig = {
  whatsappNumber: "5522999267900", // +55 22 99926-7900 — official contact number.
  whatsappDisplay: "+55 22 99926-7900",
  managementFee: 390,
  initialWebsiteFee: 100,
  mediaMin: 300,
  mediaMax: 3000,
  mediaStep: 100,
  initialCpc: 2.5,
  siteScope: "Escopo, prazos, domínio, hospedagem e condições de continuidade serão definidos na proposta.",
};

export function simulateInvestment(media: number, cpc: number, firstMonth: boolean) {
  if (!Number.isFinite(cpc) || cpc <= 0) return null;
  return {
    clicks: Math.floor(media / cpc),
    management: agencyConfig.managementFee,
    website: firstMonth ? agencyConfig.initialWebsiteFee : 0,
    total: media + agencyConfig.managementFee + (firstMonth ? agencyConfig.initialWebsiteFee : 0),
  };
}

export function whatsappUrl(message: string) {
  if (!/^\d{10,15}$/.test(agencyConfig.whatsappNumber)) return null;
  return `https://wa.me/${agencyConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/** Formats digits as a Brazilian mobile phone: (22) 99926-7900. */
export function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export const isValidPhone = (value: string) => /^\(\d{2}\) 9\d{4}-\d{4}$/.test(value);

const line = (label: string, value: string) => (value.trim() ? `*${label}:* ${value.trim()}\n` : "");

/** Builds the lead message sent to WhatsApp. Returns null when required data is missing. */
export function buildLeadMessage(data: {
  name: string; company: string; phone: string; segment: string; location?: string;
  hasSite: string; alreadyAdvertises: string; goal: string; budget: string; notes?: string;
}) {
  const required = [data.name, data.company, data.phone, data.segment, data.hasSite, data.alreadyAdvertises, data.goal, data.budget];
  if (required.some(v => !v.trim())) return null;
  return [
    "*NOVO LEAD — LAUX AGÊNCIA*",
    "",
    line("Nome", data.name) + line("Empresa", data.company) + line("WhatsApp", data.phone) +
    line("Segmento", data.segment) + line("Localização", data.location ?? "") +
    line("Possui site", data.hasSite) + line("Já anuncia", data.alreadyAdvertises) +
    line("Objetivo", data.goal) + line("Orçamento para anúncios", data.budget) +
    line("Observações", data.notes ?? "") +
    "*Interesse:* Gestão de tráfego + criação de site.\n" +
    "*Plano:* R$ 490 no primeiro mês e R$ 390/mês depois.\n" +
    "*Origem:* Site LAUX AGÊNCIA.",
  ].join("\n");
}

export const brl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
