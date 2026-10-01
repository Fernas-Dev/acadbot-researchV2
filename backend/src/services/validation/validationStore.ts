import { serviceClient } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";
import type { ValidationDetail } from "./validator.js";

export interface ValidationRecord {
  id: string;
  userId: string;
  reference: string;
  createdAt: string;
  detail: ValidationDetail;
}

/**
 * Store em memória para validações (padrão do jobManager).
 * Persistência best-effort em validation_jobs / validation_items / validation_matches.
 */
class ValidationStore {
  private items = new Map<string, ValidationRecord>();

  create(id: string, userId: string, reference: string, detail: ValidationDetail): ValidationRecord {
    const record: ValidationRecord = {
      id,
      userId,
      reference,
      createdAt: new Date().toISOString(),
      detail,
    };
    this.items.set(id, record);
    void this.persist(record);
    return record;
  }

  get(id: string): ValidationRecord | undefined {
    return this.items.get(id);
  }

  listByUser(userId: string, limit = 50): ValidationRecord[] {
    return [...this.items.values()]
      .filter((v) => v.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  countToday(userId: string): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.listByUser(userId, 1000).filter((v) => v.createdAt.startsWith(today)).length;
  }

  /** Persistência best-effort — nunca lança, funciona sem DB. */
  private async persist(record: ValidationRecord): Promise<void> {
    if (!serviceClient) return;
    try {
      const { error } = await serviceClient.from("validation_jobs").upsert(
        {
          id: record.id,
          user_id: record.userId,
          project_id: null,
          raw_reference: record.reference.slice(0, 2000),
          status: record.detail.status,
          confidence: record.detail.confidence,
          parsed: record.detail.parsed,
          problems: record.detail.outcome.problems,
          created_at: record.createdAt,
          updated_at: record.createdAt,
        },
        { onConflict: "id" },
      );
      if (error) throw error;

      if (record.detail.matches.length > 0) {
        const rows = record.detail.matches.map((m, index) => ({
          job_id: record.id,
          user_id: record.userId,
          rank: index + 1,
          provider: m.provider,
          match_data: {
            title: m.source.title,
            authors: m.source.authors,
            year: m.source.year ?? null,
            doi: m.source.doi ?? null,
            journal: m.source.journal ?? null,
            publisher: m.source.publisher ?? null,
            url: m.source.url ?? null,
          },
          confidence: m.confidence,
          field_scores: m.fieldScores,
        }));
        const { error: matchError } = await serviceClient
          .from("validation_matches")
          .upsert(rows, { onConflict: "job_id,rank" });
        if (matchError) throw matchError;
      }
    } catch (error) {
      logger.debug({ err: error, validationId: record.id }, "validation persist falhou (ignorado)");
    }
  }
}

export const validationStore = new ValidationStore();
