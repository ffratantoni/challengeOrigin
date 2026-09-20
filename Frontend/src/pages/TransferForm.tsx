import React, { useState, useEffect } from 'react'
import { getUsernameFromToken, getMyPortfolio, getToken } from '../api'
import { apiPostJson } from '../api'

export default function TransferForm(){
  const from = getUsernameFromToken() || 'Yo'
  const [to, setTo] = useState('')
  const [symbol, setSymbol] = useState<string | null>(null)
  const [portfolio, setPortfolio] = useState<Array<{symbol:string,quantity:number}>>([])
  const [amount, setAmount] = useState<number>(0)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(()=>{
    const load = ()=> getMyPortfolio().then(p=>setPortfolio(p||[])).catch(()=>setPortfolio([]))
    load()
    window.addEventListener('portfolio:changed', load as EventListener)
    return ()=> window.removeEventListener('portfolio:changed', load as EventListener)
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if(!to) { setMessage('Completá el usuario destino'); return }
    if(!amount || amount <= 0){ setMessage('Monto inválido'); return }
    try{
      const payload: any = { to_username: to, amount }
      if(symbol) payload.symbol = symbol
      const token = getToken()
      const res = await apiPostJson('/me/portfolio/transfer', payload, token || undefined)
      if(!res) { setMessage('Error de red'); return }
      if(res.status === 401){ try{ localStorage.removeItem('access_token') }catch{}; setMessage('Sesión expirada'); return }
      if(!res.ok){ const txt = await res.text().catch(()=>res.statusText); setMessage('Error: '+txt); return }
      const data = await res.json()
      // refresh portfolio and notify other components
      getMyPortfolio().then(p=>setPortfolio(p||[])).catch(()=>{})
      try{ window.dispatchEvent(new Event('portfolio:changed')) }catch{}
      setMessage(`Transferencia enviada: ${data._from} → ${data.to} $${data.amount}${data.symbol?(' ('+data.symbol+')'):''}`)
    }catch(err){
      setMessage('Error enviando transferencia')
    }
  }

  return (
    <form onSubmit={submit} style={{display:'grid',gap:8}}>
      <label>Desde<input value={from} readOnly /></label>
      <label>Hacia<input value={to} onChange={e=>setTo(e.target.value)} placeholder="username destino" /></label>
      <label>Símbolo
        <select value={symbol||''} onChange={e=>setSymbol(e.target.value || null)}>
          <option value="">-- ninguno --</option>
          {portfolio.map(p=> <option key={p.symbol} value={p.symbol}>{p.symbol} ({p.quantity})</option>)}
        </select>
      </label>
      <label>Monto<input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} min={0} step="0.01" /></label>
      <div>
        <button type="submit">Transferir</button>
      </div>
      {message && <div style={{marginTop:8,background:'#f6fff6',padding:8,borderRadius:4}}>{message}</div>}
    </form>
  )
}
