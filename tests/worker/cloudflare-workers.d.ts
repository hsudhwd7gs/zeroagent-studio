/**
 * Minimal ambient Cloudflare Workers type declarations.
 *
 * worker/index.ts is bundled by wrangler (which brings its own types at
 * deploy time) but unit tests in tests/worker/ import it into the app's
 * TypeScript program, which otherwise only knows DOM types. This file
 * declares just the pieces the worker uses — everything merges cleanly
 * with lib.dom (notably `CacheStorage.default` via interface merging).
 */

interface KVNamespaceListKey {
  name: string
  expiration?: number
  metadata?: unknown
}

interface KVNamespaceListResult {
  keys: KVNamespaceListKey[]
  list_complete: boolean
  cursor?: string
}

interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | null>
  get(key: string, options: { type: 'json' }): Promise<unknown>
  getWithMetadata(key: string): Promise<{ value: string | null; metadata: unknown }>
  put(key: string, value: string | ReadableStream | ArrayBuffer, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<KVNamespaceListResult>
}

interface D1Result<T = unknown> {
  results: T[]
  success: boolean
  meta: Record<string, unknown>
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  run<T = unknown>(): Promise<D1Result<T>>
  raw<T = unknown>(): Promise<T[]>
}

interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>
  exec(query: string): Promise<Record<string, unknown>>
}

interface R2ObjectBody {
  body: ReadableStream
  httpMetadata?: { contentType?: string }
  key: string
  size: number
  uploaded: Date
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>
  put(key: string, value: ReadableStream | ArrayBuffer | string | Blob, options?: Record<string, unknown>): Promise<unknown>
  delete(key: string): Promise<void>
  list(options?: { limit?: number; cursor?: string; prefix?: string }): Promise<{ objects: R2ObjectBody[]; truncated: boolean; cursor?: string }>
  head(key: string): Promise<unknown>
}

interface Fetcher {
  fetch(input: RequestInfo | string, init?: RequestInit): Promise<Response>
}

interface Ai {
  run(model: string, input: Record<string, unknown> | unknown): Promise<unknown>
}

interface AnalyticsEngineDataset {
  writeDataPoint(event: { blobs?: Array<string | null>; doubles?: Array<number | null>; indexes?: Array<string | null> }): void
}

interface ScheduledController {
  readonly cron: string
  readonly scheduledTime: number
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}

// Cloudflare extends the standard CacheStorage with a `default` namespace
// that lives on the edge closest to the caller. Interface-merge with DOM.
interface CacheStorage {
  readonly default: Cache
}
