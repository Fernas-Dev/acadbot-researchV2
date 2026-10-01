/**
 * CacheService — camada de cache em memória com TTL e limite de entradas.
 * A interface permite trocar por Redis no futuro sem alterar os consumidores.
 */
export interface ICache {
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown, ttlMs?: number): void;
  delete(key: string): void;
  wrap<T>(key: string, fn: () => Promise<T>, ttlMs?: number): Promise<T>;
  clear(): void;
  stats(): { size: number };
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

export class CacheService implements ICache {
  private store = new Map<string, CacheEntry>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;

  constructor(options: { ttlMs?: number; maxEntries?: number } = {}) {
    this.defaultTtlMs = options.ttlMs ?? 10 * 60_000;
    this.maxEntries = options.maxEntries ?? 1_000;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // Reordena para o fim (LRU aproximado por inserção)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value as T;
  }

  set(key: string, value: unknown, ttlMs?: number): void {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  async wrap<T>(key: string, fn: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const value = await fn();
    this.set(key, value, ttlMs);
    return value;
  }

  clear(): void {
    this.store.clear();
  }

  stats(): { size: number } {
    return { size: this.store.size };
  }
}

/** Cache geral da aplicação. */
export const cache = new CacheService({ ttlMs: 10 * 60_000, maxEntries: 1_000 });

/** Cache de resultados de health check dos providers (evita spam nas APIs). */
export const healthCache = new CacheService({ ttlMs: 60_000, maxEntries: 100 });

/** Cache de verificação de JWT do Supabase (latência de rede). */
export const tokenCache = new CacheService({ ttlMs: 30_000, maxEntries: 500 });
