export const agencyConfig = {
  whatsappNumber: "", // Set the real international number, digits only, before launch.
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

export const brl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);