import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPostJson, apiPostForm, saveToken } from '../api'
import { getToken } from '../api'

export default function RegisterPage(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(()=>{
    const token = getToken()
    if(token) navigate('/app')
  }, [navigate])

  async function handleSubmit(e: React.FormEvent){
    e.preventDefault()
    setError('')
    if(!username || !password){
      setError('Completar usuario y clave')
      return
    }
    if(password !== confirm){
      setError('Las contraseñas no coinciden')
      return
    }
    try{
      const res = await apiPostJson('/auth/register', { username, password })
      if(!res.ok){
        const data = await res.json().catch(() => ({}))
        setError(data.detail || 'Error creando usuario')
        return
      }
      // Auto-login after register
      const form = new URLSearchParams()
      form.append('username', username)
      form.append('password', password)
      const loginRes = await apiPostForm('/auth/login', form)
      if (loginRes.ok) {
        const data = await loginRes.json().catch(() => ({}))
        if (data.access_token) saveToken(data.access_token)
      }
      alert('Usuario creado')
      navigate('/app')
    }catch(err){
      setError('Error de conexión')
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Crear usuario</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Usuario
            <input value={username} onChange={e => setUsername(e.target.value)} />
          </label>
          <label>
            Clave
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <label>
            Repetir Clave
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit">Crear</button>
          <button type="button" className="secondary-button" onClick={() => navigate(-1)}>Volver</button>
        </form>
      </div>
    </div>
  )
}
