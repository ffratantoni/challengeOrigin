import React, { useEffect, useState } from 'react'
import { getMyFavorites, fetchStocksBySymbols, executeTrade, getMyPortfolio } from '../api'

export default function TradeForm(){
  const [symbol, setSymbol] = useState('')
  const [qty, setQty] = useState(1)
  const [side, setSide] = useState<'buy'|'sell'>('buy')
  const [message, setMessage] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [price, setPrice] = useState<number | null>(null)

  useEffect(()=>{
    getMyFavorites().then(list=>setFavorites(list || [])).catch(()=>setFavorites([]))
    const h = ()=> getMyFavorites().then(list=>setFavorites(list || [])).catch(()=>setFavorites([]))
    window.addEventListener('favorites:changed', h as EventListener)
    const p = ()=> getMyPortfolio().then(list=>{/* no-op, favorites not dependent but keep for safety */}).catch(()=>{})
    window.addEventListener('portfolio:changed', p as EventListener)
    return ()=> {
      window.removeEventListener('favorites:changed', h as EventListener)
      window.removeEventListener('portfolio:changed', p as EventListener)
    }
  }, [])

  useEffect(()=>{
    if(!symbol) { setPrice(null); return }
    // fetch basic info for the symbol to display 'current price' via timeseries latest value
    fetchStocksBySymbols([symbol]).then(data=>{
      if(Array.isArray(data) && data.length>0){
        // price not provided by stocks endpoint; for demo we set null
      }
    }).catch(()=>{})
    // lightweight: call timeseries proxy for 1min and take last value
    import('../api').then(api=>{
      api.fetchTimeSeries(symbol, 'realtime', '1min').then((ts: any)=>{
        if(ts && Array.isArray(ts.values) && ts.values.length>0){
          const v = ts.values[ts.values.length-1]
          setPrice(typeof v === 'number' ? v : null)
        } else setPrice(null)
      }).catch(()=>setPrice(null))
    })
  }, [symbol])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if(!symbol) { setMessage('Completá el símbolo'); return }
    if(qty <= 0) { setMessage('Cantidad inválida'); return }
    // if selling, validate holdings
    if(side === 'sell'){
      getMyPortfolio().then(port=>{
        const h = (port || []).find((p:any)=>p.symbol===symbol)
        const have = h ? Number(h.quantity) : 0
        if(have < qty){
          setMessage(`No tenés suficientes acciones para vender (tenés ${have})`)
          return
        }
        // execute trade
        executeTrade(symbol, qty, false).then(res=>{
          if(res) {
            setMessage(`Venta registrada: ${res.quantity} ${res.symbol}`)
            try{ window.dispatchEvent(new Event('portfolio:changed')) }catch{}
          }
          else setMessage('Error al ejecutar la venta')
        })
      }).catch(()=> setMessage('Error comprobando portfolio'))
      return
    }

    // buy
    executeTrade(symbol, qty, true).then(res=>{
      if(res) {
        setMessage(`Compra registrada: ${res.quantity} ${res.symbol}`)
        try{ window.dispatchEvent(new Event('portfolio:changed')) }catch{}
      }
      else setMessage('Error al ejecutar la compra')
    }).catch(()=>setMessage('Error al ejecutar la compra'))
  }

  return (
    <form onSubmit={submit} style={{display:'grid',gap:8}}>
      <label>Símbolo
        <select value={symbol} onChange={e=>setSymbol(e.target.value)}>
          <option value="">-- elige --</option>
          {favorites.map(f=> <option key={f} value={f}>{f}</option>)}
        </select>
      </label>
      <div>Precio actual: {price ? `$${price}` : <em>sin datos</em>}</div>
      <label>Cantidad<input type="number" value={qty} onChange={e=>setQty(Number(e.target.value))} min={1} /></label>
      <div>
        <label style={{marginRight:8}}><input type="radio" name="side" checked={side==='buy'} onChange={()=>setSide('buy')} /> Comprar</label>
        <label><input type="radio" name="side" checked={side==='sell'} onChange={()=>setSide('sell')} /> Vender</label>
      </div>
      <div>
        <button type="submit">Enviar</button>
      </div>
      {message && <div style={{marginTop:8,background:'#f6f8ff',padding:8,borderRadius:4}}>{message}</div>}
    </form>
  )
}
