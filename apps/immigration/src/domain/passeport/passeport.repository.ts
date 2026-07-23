import type { Passeport, PasseportHistoryEntry, PasseportStats } from "./passeport.schema";

/**
 * Port for passport request persistence. The application layer depends
 * only on this interface, never on a concrete storage/transport
 * implementation — swap the localStorage adapter for the HTTP adapter
 * without touching use-cases or UI.
 */
export interface PasseportRepository {
  list(page?: number, pageSize?: number): Promise<Passeport[]>;
  getById(id: string): Promise<Passeport | undefined>;
  save(passeport: Passeport): Promise<Passeport>;
  remove(id: string): Promise<void>;
  instruire(passeport: Passeport): Promise<Passeport>;
  valider(passeport: Passeport): Promise<Passeport>;
  rejeter(passeport: Passeport, reason: string): Promise<Passeport>;
  getStats(): Promise<PasseportStats>;
  getHistory(id: string): Promise<PasseportHistoryEntry[]>;
}
