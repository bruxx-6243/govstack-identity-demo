import type { Casier } from "./casier.schema";

/**
 * Port for casier judiciaire request persistence. The application layer
 * depends only on this interface, never on a concrete storage/transport
 * implementation — swap the localStorage adapter for the HTTP adapter
 * without touching use-cases or UI.
 */
export interface CasierRepository {
  list(): Promise<Casier[]>;
  getById(id: string): Promise<Casier | undefined>;
  save(casier: Casier): Promise<Casier>;
  remove(id: string): Promise<void>;
}
