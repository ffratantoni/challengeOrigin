import React, { useEffect, useState, useMemo, useRef } from 'react'
import { fetchStocks, addMyFavorite, removeMyFavorite, getMyFavorites, getToken } from '../api'

const FAV_KEY = 'fav_stocks'

function loadFavs(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveFavs(list: string[]) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(list)) } catch {}
}

export default function StocksList(){
  const [items, setItems] = useState<Array<{ simbolo:string; nombre:string; moneda:string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<{ simbolo:string; nombre:string; moneda:string }>({simbolo:'',nombre:'',moneda:''})
  const [editing, setEditing] = useState<null | 'simbolo' | 'nombre' | 'moneda'>(null)
  const [favs, setFavs] = useState<string[]>([])
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({})
  const pendingRef = useRef<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement|null>(null)

  useEffect(()=>{
    let mounted = true
    setLoading(true)
    fetchStocks().then(data=>{
      if(!mounted) return
      setItems(data)
    }).catch(err=>{
      if(!mounted) return
      setError(err.message)
    }).finally(()=>{
      if(!mounted) return
      setLoading(false)
    })

    // load server favorites (if authenticated)
    getMyFavorites().then(list=>{
      if(!mounted) return
      setFavs(list || [])
    }).catch(()=>{})
    return ()=>{ mounted = false }
  }, [])

  useEffect(()=>{
    if(editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const toggleFav = (symbol: string) => {
    const s = String(symbol)
    // use a global pending set so multiple mounted instances don't duplicate
    const g = (window as any).__pendingFavs = (window as any).__pendingFavs || new Set<string>()
    if (g.has(s)) return
    g.add(s)
    pendingRef.current.add(s)
    setPendingMap(p => ({ ...p, [s]: true }))

    setFavs(prev => {
      const exists = prev.includes(s)
      const next = exists ? prev.filter(x => x !== s) : [...prev, s]
      // optimistically update UI
      const token = getToken()
      if (!token) {
        // not authenticated: persist locally and inform user
        saveFavs(next)
        window.alert('Favorito guardado localmente. Iniciá sesión para sincronizarlo con el servidor.')
        // clear pending for local case
        pendingRef.current.delete(s)
        setPendingMap(p => { const np = { ...p }; delete np[s]; return np })
      } else {
        const clearPending = () => {
          const globalSet = (window as any).__pendingFavs
          if (globalSet && typeof globalSet.delete === 'function') globalSet.delete(s)
          pendingRef.current.delete(s)
          setPendingMap(p => { const np = { ...p }; delete np[s]; return np })
        }
        if (exists) {
          // try server remove, fallback to localStorage removal if error
          removeMyFavorite(s).then(ok => { if (!ok) saveFavs(next) }).catch(() => saveFavs(next)).finally(clearPending)
        } else {
          addMyFavorite(s).then(ok => { if (!ok) saveFavs(next) }).catch(() => saveFavs(next)).finally(clearPending)
        }
      }
      // notify listeners (FavoritesList) about change
      try { window.dispatchEvent(new CustomEvent('favorites:changed', { detail: next })) } catch {}
      return next
    })
  }

  const filtered = useMemo(()=>{
    const textSim = filters.simbolo.trim().toLowerCase()
    const textNom = filters.nombre.trim().toLowerCase()
    const textMon = filters.moneda.trim().toLowerCase()
    return items.filter(it=>{
      if(textSim && !String(it.simbolo||'').toLowerCase().includes(textSim)) return false
      if(textNom && !String(it.nombre||'').toLowerCase().includes(textNom)) return false
      if(textMon && !String(it.moneda||'').toLowerCase().includes(textMon)) return false
      return true
    })
  }, [items, filters])

  if(loading) return <div>Cargando stocks...</div>
  if(error) return <div className="error">{error}</div>

  return (
    <div>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead>
          <tr style={{textAlign:'left',borderBottom:'1px solid rgba(0,0,0,0.08)'}}>
            <th style={{cursor:'pointer',width:'20%'}} onClick={()=>setEditing('simbolo')}>
              {editing==='simbolo' ? (
                <input ref={inputRef} value={filters.simbolo} onChange={e=>setFilters(f=>({...f,simbolo:e.target.value}))} onBlur={()=>setEditing(null)} placeholder="Buscar símbolo" />
              ) : (
                'Símbolo'
              )}
            </th>
            <th style={{cursor:'pointer'}} onClick={()=>setEditing('nombre')}>
              {editing==='nombre' ? (
                <input ref={inputRef} value={filters.nombre} onChange={e=>setFilters(f=>({...f,nombre:e.target.value}))} onBlur={()=>setEditing(null)} placeholder="Buscar nombre" />
              ) : (
                'Nombre'
              )}
            </th>
            <th style={{cursor:'pointer',width:'12%'}} onClick={()=>setEditing('moneda')}>
              {editing==='moneda' ? (
                <input ref={inputRef} value={filters.moneda} onChange={e=>setFilters(f=>({...f,moneda:e.target.value}))} onBlur={()=>setEditing(null)} placeholder="Buscar moneda" />
              ) : (
                'Moneda'
              )}
            </th>
            <th style={{width: '48px', textAlign:'center'}} aria-hidden> </th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(s=> (
            <tr key={s.simbolo || Math.random()} style={{borderBottom:'1px solid rgba(0,0,0,0.03)'}}>
              <td style={{padding:'0.5rem 0'}}>{s.simbolo}</td>
              <td style={{padding:'0.5rem 0'}}>{s.nombre}</td>
              <td style={{padding:'0.5rem 0'}}>{s.moneda}</td>
              <td style={{padding:'0.25rem 0', textAlign:'center'}}>
                <button aria-label={favs.includes(String(s.simbolo))? 'Quitar favorito':'Agregar favorito'} onClick={()=>toggleFav(s.simbolo)} disabled={!!pendingMap[String(s.simbolo)]} style={{background:'none',border:'none',cursor: pendingMap[String(s.simbolo)] ? 'default' : 'pointer', opacity: pendingMap[String(s.simbolo)] ? 0.6 : 1}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={favs.includes(String(s.simbolo))? '#e25555':'#ccc'} xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 21s-7.033-4.868-9.333-8.134C-0.022 7.593 3.06 4 6.667 4c1.867 0 3.333 1.333 3.333 1.333S11.466 4 13.333 4C16.94 4 20.022 7.593 21.333 12.866 19.033 16.132 12 21 12 21z" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <div style={{marginTop:8}}>No se encontraron resultados.</div>}
    </div>
  )
}
