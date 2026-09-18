const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
