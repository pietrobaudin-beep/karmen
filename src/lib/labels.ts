import "server-only";
import { eq } from "drizzle-orm";
import { db, ensureDb } from "@/db";
import { personaConfig } from "@/db/schema";
import { getPreset } from "@/lib/personas";

export interface Labels {
  entity: string;
  entityPlural: string;
  session: string;
  sessionPlural: string;
  note: string;
  task: string;
}

// Carrega os labels da persona para uma org. Fallback no preset genérico.
export async function getLabels(orgId: string, personaType: string): Promise<Labels> {
  await ensureDb();
  const [cfg] = await db.select().from(personaConfig).where(eq(personaConfig.orgId, orgId)).limit(1);
  if (cfg) {
    return {
      entity: cfg.entityLabel,
      entityPlural: cfg.entityLabelPlural,
      session: cfg.sessionLabel,
      sessionPlural: cfg.sessionLabelPlural,
      note: cfg.noteLabel,
      task: cfg.taskLabel,
    };
  }
  const p = getPreset(personaType);
  return {
    entity: p.entityLabel,
    entityPlural: p.entityLabelPlural,
    session: p.sessionLabel,
    sessionPlural: p.sessionLabelPlural,
    note: p.noteLabel,
    task: p.taskLabel,
  };
}
