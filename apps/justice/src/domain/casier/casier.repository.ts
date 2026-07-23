import type { Casier, CasierHistoryEntry, CasierStats } from "./casier.schema";

/**
 * Port for casier judiciaire request persistence. The application layer
 * depends only on this interface, never on a concrete storage/transport
 * implementation — swap the localStorage adapter for the HTTP adapter
 * without touching use-cases or UI.
 */
export interface CasierRepository {
  list(page?: number, pageSize?: number): Promise<Casier[]>;
  getById(id: string): Promise<Casier | undefined>;
  save(casier: Casier): Promise<Casier>;
  remove(id: string): Promise<void>;
  instruire(casier: Casier): Promise<Casier>;
  valider(casier: Casier): Promise<Casier>;
  rejeter(casier: Casier, reason: string): Promise<Casier>;
  getStats(): Promise<CasierStats>;
  getHistory(id: string): Promise<CasierHistoryEntry[]>;
}
