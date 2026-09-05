import { vi } from 'vitest'

/**
 * Supabase client'ı için test double.
 *
 * Gerçek client zincirlenebilir bir sorgu kurucu döndürür ve kurucu "thenable"dır
 * (await edilebilir). Burada aynı şekli taklit ediyoruz: from(tablo) zincirlenebilir
 * bir nesne verir, await edilince testin ayarladığı sonucu döndürür.
 */
export function createSupabaseMock() {
  // tablo -> { select, insert, update, delete } yanıtları
  const responses = {}
  const calls = []
  // realtime: tablo -> handler
  const realtimeHandlers = {}
  let subscribeStatus = 'SUBSCRIBED'
  const removedChannels = []

  const setResponse = (table, op, value) => {
    responses[table] = responses[table] || {}
    responses[table][op] = value
  }

  const resultFor = (table, op) => {
    const forTable = responses[table] || {}
    if (op in forTable) return forTable[op]
    // Varsayılan: boş başarı
    if (op === 'select') return { data: [], error: null }
    return { data: null, error: null }
  }

  const from = vi.fn((table) => {
    const state = { table, op: 'select', payload: null, filters: [] }

    const builder = {
      select: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      range: vi.fn(() => builder),
      single: vi.fn(() => builder),
      maybeSingle: vi.fn(() => builder),
      insert: vi.fn((payload) => { state.op = 'insert'; state.payload = payload; return builder }),
      update: vi.fn((payload) => { state.op = 'update'; state.payload = payload; return builder }),
      upsert: vi.fn((payload) => { state.op = 'upsert'; state.payload = payload; return builder }),
      delete: vi.fn(() => { state.op = 'delete'; return builder }),
      eq: vi.fn((col, val) => { state.filters.push([col, val]); return builder }),
      then: (resolve, reject) => {
        calls.push({ table: state.table, op: state.op, payload: state.payload, filters: state.filters })
        return Promise.resolve(resultFor(state.table, state.op)).then(resolve, reject)
      },
    }
    return builder
  })

  const channel = vi.fn(() => {
    const ch = {
      on: vi.fn((_event, config, handler) => {
        realtimeHandlers[config.table] = { handler, filter: config.filter }
        return ch
      }),
      subscribe: vi.fn((cb) => {
        if (cb) cb(subscribeStatus)
        return ch
      }),
    }
    return ch
  })

  const removeChannel = vi.fn((ch) => { removedChannels.push(ch) })

  return {
    client: { from, channel, removeChannel },
    // test yardımcıları
    setResponse,
    calls,
    callsFor: (table, op) => calls.filter(c => c.table === table && (!op || c.op === op)),
    /** Realtime olayı tetikle */
    emit: (table, payload) => realtimeHandlers[table]?.handler(payload),
    filterFor: (table) => realtimeHandlers[table]?.filter,
    setSubscribeStatus: (s) => { subscribeStatus = s },
    removedChannels,
    reset: () => {
      calls.length = 0
      Object.keys(responses).forEach(k => delete responses[k])
      Object.keys(realtimeHandlers).forEach(k => delete realtimeHandlers[k])
      removedChannels.length = 0
    },
  }
}
