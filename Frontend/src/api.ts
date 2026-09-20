const API_BASE = (typeof window !== 'undefined' && (window as any).__VITE_API_URL__) || 'http://localhost:8000'

// Simple in-flight request deduper: key => Promise<parsed result>
const _inFlight: Map<string, Promise<any>> = new Map()
function _requestKey(url: string, options?: RequestInit) {
  const method = (options && options.method ? options.method : 'GET').toString().toUpperCase()
  let body = ''
  try {
    if (options && (options as any).body) {
      body = typeof (options as any).body === 'string' ? (options as any).body : JSON.stringify((options as any).body)
    }
  } catch {}
  return `${method} ${url} ${body}`
}

async function _dedupRequest(url: string, options?: RequestInit) {
  const key = _requestKey(url, options)
  if (_inFlight.has(key)) return _inFlight.get(key)
  const p = (async () => {
    const res = await fetch(url, options)
    // try to read text and parse JSON if possible; return both
    let text: string | null = null
    try { text = await res.clone().text() } catch {}
    let json: any = null
    try { if (text) json = JSON.parse(text) } catch {}
    return { ok: res.ok, status: res.status, json, text }
  })()
  _inFlight.set(key, p)
  p.finally(() => { _inFlight.delete(key) })
  return p
}

export async function apiPostJson(path: string, body: any, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  })
  return res
}

export async function apiPostForm(path: string, form: URLSearchParams) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form.toString()
  })
  return res
}

export function saveToken(token: string) {
  localStorage.setItem('access_token', token)
}

export function getToken() {
  return localStorage.getItem('access_token')
}

export default API_BASE

export function getUsernameFromToken(): string | null {
  const token = getToken()
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.sub || null
  } catch (e) {
    return null
  }
}

export async function fetchStocks(): Promise<Array<{ simbolo: string; nombre: string; moneda: string }>> {
  const STOCKS_API = (typeof window !== 'undefined' && (window as any).__VITE_STOCKS_API__) || `${API_BASE}/stocks?country=United%20States`
  const result = await _dedupRequest(STOCKS_API, { cache: 'no-cache' })
  if (!result || !result.ok) throw new Error(`Failed fetching stocks: ${result?.status}`)
  const data = result.json
  // Ensure simbolo is string (some responses may include numeric-like values)
  return (Array.isArray(data) ? data : []).map((i: any) => ({
    simbolo: String(i.simbolo ?? i.symbol ?? ''),
    nombre: i.nombre ?? i.name ?? '',
    moneda: i.moneda ?? i.currency ?? ''
  }))
}

export async function fetchStocksBySymbols(symbols: string[]): Promise<any[]> {
  if (!symbols || symbols.length === 0) return []
  const qs = `?symbol=${encodeURIComponent(symbols.join(','))}`
  const url = `${API_BASE}/stocks${qs}`
  console.debug('[api] fetchStocksBySymbols', { ts: Date.now(), url, symbols })
  const r = await _dedupRequest(url, { cache: 'no-cache' })
  console.debug('[api] fetchStocksBySymbols result', { ts: Date.now(), ok: !!r?.ok, status: r?.status, textLength: r?.text ? r.text.length : 0, textSnippet: r?.text ? r.text.slice(0,500) : null })
  if (!r || !r.ok) return []
  return Array.isArray(r.json) ? r.json : []
}

export async function fetchTimeSeries(symbol: string, mode: 'realtime'|'historical', interval: '1min'|'5min'|'15min'){
  const qs = `?symbol=${encodeURIComponent(symbol)}&mode=${encodeURIComponent(mode)}&interval=${encodeURIComponent(interval)}`
  const url = `${API_BASE}/stocks/timeseries${qs}`
  const r = await _dedupRequest(url, { cache: 'no-cache' })
  if (!r || !r.ok) throw new Error('Failed fetching time series')
  return r.json
}

// Favorites API helpers (server-backed)
export async function getMyFavorites(): Promise<string[]> {
  const token = getToken()
  console.debug('[api] getMyFavorites', { ts: Date.now(), hasToken: !!token })
  const headers = { ...(token? { Authorization: `Bearer ${token}` } : {}) }
  const r = await _dedupRequest(`${API_BASE}/me/favorites/`, { headers, cache: 'no-cache' })
  if (!r || !r.ok) return []
  return Array.isArray(r.json) ? r.json : []
}

export async function addMyFavorite(symbol: string): Promise<boolean> {
  const token = getToken()
  console.debug('[api] addMyFavorite', { ts: Date.now(), symbol, hasToken: !!token, stack: (new Error()).stack?.split('\n').slice(0,3) })
  const headers = { 'Content-Type': 'application/json', ...(token? { Authorization: `Bearer ${token}` } : {}) }
  const body = JSON.stringify({ symbol })
  const r = await _dedupRequest(`${API_BASE}/me/favorites/`, { method: 'POST', headers, body })
  return !!(r && r.ok)
}

export async function removeMyFavorite(symbol: string): Promise<boolean> {
  const token = getToken()
  console.debug('[api] removeMyFavorite', { ts: Date.now(), symbol, hasToken: !!token })
  const headers = { ...(token? { Authorization: `Bearer ${token}` } : {}) }
  const r = await _dedupRequest(`${API_BASE}/me/favorites/${encodeURIComponent(symbol)}`, { method: 'DELETE', headers })
  return !!(r && r.ok)
}
