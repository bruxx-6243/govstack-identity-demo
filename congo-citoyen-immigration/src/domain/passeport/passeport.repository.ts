import type { Passeport } from "./passeport.schema";

/**
 * Port for passport request persistence. The application layer depends
 * only on this interface, never on a concrete storage/transport
 * implementation — swap the localStorage adapter for the HTTP adapter
 * without touching use-cases or UI.
 */
export interface PasseportRepository {
  list(): Promise<Passeport[]>;
  getById(id: string): Promise<Passeport | undefined>;
  save(passeport: Passeport): Promise<Passeport>;
  remove(id: string): Promise<void>;
}
