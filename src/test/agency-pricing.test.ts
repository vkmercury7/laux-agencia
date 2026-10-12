import { describe, expect, it } from "vitest";
import { agencyConfig, simulateInvestment, whatsappUrl } from "../lib/agency-config";
describe("LAUX commercial rules", () => {
  it("charges R$390 recurring management", () => { expect(simulateInvestment(300, 2.5, false)?.management).toBe(390); });
  it("charges R$100 for the site only in the first month", () => { expect(simulateInvestment(300, 2.5, true)?.website).toBe(100); expect(simulateInvestment(300, 2.5, false)?.website).toBe(0); });
  it("adds separate media to the R$490 first month plan", () => { expect(simulateInvestment(300, 2.5, true)?.total).toBe(790); });
  it("adds separate media to the R$390 subsequent month plan", () => { expect(simulateInvestment(300, 2.5, false)?.total).toBe(690); });
  it("estimates clicks from media divided by hypothetical CPC", () => { expect(simulateInvestment(1000, 2.5, true)?.clicks).toBe(400); });
  it("uses R$2.50 as initial hypothetical CPC", () => { expect(agencyConfig.initialCpc).toBe(2.5); });
  it("uses media bounds R$300–R$3000 with R$100 steps", () => { expect([agencyConfig.mediaMin, agencyConfig.mediaMax, agencyConfig.mediaStep]).toEqual([300, 3000, 100]); });
  it("does not generate a fake WhatsApp destination", () => { expect(whatsappUrl("Olá")).toBeNull(); });
  it("rejects zero CPC", () => { expect(simulateInvestment(300, 0, true)).toBeNull(); });
});