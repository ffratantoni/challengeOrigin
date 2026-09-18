import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPostForm, saveToken } from '../api'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const form = new URLSearchParams()
      form.append('username', username)
      form.append('password', password)
      const res = await apiPostForm('/auth/login', form)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || 'usuario o clave invalida')
        return
      }
      const data = await res.json()
      saveToken(data.access_token)
      navigate('/')
    } catch (err) {
      setError('Error de conexión')
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Challenge Acciones</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Usuario
            <input value={username} onChange={e => setUsername(e.target.value)} />
          </label>
          <label>
            Clave
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit">Ingresar</button>
          <button type="button" className="secondary-button" onClick={() => navigate('/register')}>Crear usuario</button>
        </form>
      </div>
    </div>
  )
}
