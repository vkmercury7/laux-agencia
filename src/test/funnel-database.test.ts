import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env["SUPABASE_URL"];
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
describe.skipIf(!url || !key)("Funnel appointment database rules", () => {
  const db = createClient(url || "http://localhost", key || "unused", {
    auth: { persistSession: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key?.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      if (key) headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  let leadId = "";
  let ownerId = "";
  let count = 0;
  beforeAll(async () => {
    const { data: roles, error: roleError } = await db.from("user_roles").select("user_id").eq("role", "super_admin").limit(1);
    if (roleError || !roles?.[0]) throw new Error("A main administrator is needed for this integration test");
    ownerId = roles[0].user_id;
    const { data, error } = await db.from("leads").insert({ name: "Automated funnel rules test", company: "Test only", segment: "Serviços", has_site: "Não", uses_instagram: "Não", advertises: "Nunca investi", goals: ["Conseguir mais clientes"], phone: "(22) 99999-0020", location: "Test", budget: "Até R$ 500", consent: true }).select("id").single();
    if (error || !data) throw new Error("Test lead could not be created");
    leadId = data.id;
  });
  afterAll(async () => {
    if (!leadId) return;
    await db.from("agendamentos").delete().eq("lead_id", leadId);
    await db.from("leads").delete().eq("id", leadId);
  });
  async function readStage() {
    const { data, error } = await db.from("leads").select("funnel_stage").eq("id", leadId).single();
    if (error) throw error;
    return data?.funnel_stage;
  }
  async function appointment() {
    count++;
    const start = new Date(`2038-11-${String(count).padStart(2, "0")}T07:00:00Z`);
    const { error } = await db.from("agendamentos").insert({ lead_id: leadId, nome_cliente: "Automated funnel rules test", whatsapp: "(22) 99999-0020", data_hora_inicio: start.toISOString(), data_hora_fim: new Date(start.getTime() + 1800000).toISOString(), responsavel_id: ownerId, responsavel_email: "test-only@example.invalid" });
    if (error) throw error;
  }
  it("new leads default to Novo lead", async () => { expect(await readStage()).toBe("novo_lead"); });
  it("linked appointment changes the stage to Reunião marcada", async () => { await appointment(); expect(await readStage()).toBe("reuniao_marcada"); });
  it("appointments preserve Fechado", async () => {
    await db.from("leads").update({ funnel_stage: "fechado" }).eq("id", leadId);
    await appointment(); expect(await readStage()).toBe("fechado");
  });
  it("appointments preserve Perdido", async () => {
    await db.from("leads").update({ funnel_stage: "perdido" }).eq("id", leadId);
    await appointment(); expect(await readStage()).toBe("perdido");
  });
  it("moving a lead never creates appointments or changes their statuses", async () => {
    await db.from("leads").update({ funnel_stage: "em_contato" }).eq("id", leadId);
    const { data, error } = await db.from("agendamentos").select("status").eq("lead_id", leadId);
    if (error) throw error;
    expect(data).toHaveLength(3);
    expect(data?.map((row) => row.status)).toEqual(["agendada", "agendada", "agendada"]);
  });
});