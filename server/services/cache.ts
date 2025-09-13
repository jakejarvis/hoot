export class TTLCache<Key, Value> {
  private store = new Map<string, { value: Value; expiresAt: number }>()

  constructor(private ttlMs: number, private serializeKey: (k: Key) => string) {}

  get(key: Key): Value | undefined {
    const sk = this.serializeKey(key)
    const entry = this.store.get(sk)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(sk)
      return undefined
    }
    return entry.value
  }

  set(key: Key, value: Value) {
    const sk = this.serializeKey(key)
    this.store.set(sk, { value, expiresAt: Date.now() + this.ttlMs })
  }

  async getOrSet(key: Key, loader: () => Promise<Value>): Promise<Value> {
    const cached = this.get(key)
    if (cached !== undefined) return cached
    const value = await loader()
    this.set(key, value)
    return value
  }
}


