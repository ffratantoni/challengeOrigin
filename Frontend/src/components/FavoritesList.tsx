import React, { useEffect, useState } from 'react'
import { getMyFavorites, fetchStocksBySymbols } from '../api'

export default function FavoritesList(){
  const [symbols, setSymbols] = useState<string[]>([])
  const [items, setItems] = useState<any[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any|null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(()=>{
    setLoading(true)
    getMyFavorites().then(list=>{
      setSymbols(list || [])
    }).catch(()=>setSymbols([])).finally(()=>setLoading(false))

    const handler = (e: any) => {
      // reload favorites when they change
      setLoading(true)
      getMyFavorites().then(list=>{
        setSymbols(list || [])
      }).catch(()=>setSymbols([])).finally(()=>setLoading(false))
    }
    window.addEventListener('favorites:changed', handler as EventListener)
    return () => window.removeEventListener('favorites:changed', handler as EventListener)
  }, [])

  // populate combo directly from favorites (symbols only)
  useEffect(()=>{
    const uniq = Array.from(new Set(symbols))
    const minimal = uniq.map(s => ({ simbolo: s }))
    setItems(minimal)
  }, [symbols])

  // when a symbol is selected, fetch detailed info for that symbol
  useEffect(()=>{
    if(!selectedSymbol){
      setSelectedItem(null)
      return
    }
    setDetailLoading(true)
    fetchStocksBySymbols([selectedSymbol]).then(data=>{
      if(Array.isArray(data) && data.length>0){
        setSelectedItem(data[0])
      } else {
        setSelectedItem({ simbolo: selectedSymbol, nombre: '', moneda: '' })
      }
    }).catch(err=>{
      console.error('[FavoritesList] error fetching detail for', selectedSymbol, err)
      setSelectedItem({ simbolo: selectedSymbol, nombre: '', moneda: '' })
    }).finally(()=>setDetailLoading(false))
  }, [selectedSymbol])

  // chart wiring: mount StockChart on Graficar click
  useEffect(()=>{
    const plotBtn = document.getElementById('chart-plot')
    const intervalSelect = document.getElementById('chart-interval') as HTMLSelectElement | null
    const historicalFields = document.getElementById('historical-fields')
    const modeInputs = Array.from(document.querySelectorAll('input[name="chart-mode"]')) as HTMLInputElement[]
    const startInput = document.getElementById('chart-start') as HTMLInputElement | null
    const endInput = document.getElementById('chart-end') as HTMLInputElement | null
    if(!plotBtn) return
    const onModeChange = () => {
      const selected = (document.querySelector('input[name="chart-mode"]:checked') as HTMLInputElement | null)
      if(historicalFields) historicalFields.style.display = (selected && selected.value==='historical') ? 'block' : 'none'
    }
    modeInputs.forEach(i=>i.addEventListener('change', onModeChange))

    const handler = () => {
      if(!selectedItem) return
      const modeInput = (document.querySelector('input[name="chart-mode"]:checked') as HTMLInputElement | null)
      const mode = modeInput ? (modeInput.value as 'realtime'|'historical') : 'realtime'
      const interval = intervalSelect ? (intervalSelect.value as '1min'|'5min'|'15min') : '1min'
      const start = startInput && startInput.value ? startInput.value.replace('T', ' ') : undefined
      const end = endInput && endInput.value ? endInput.value.replace('T', ' ') : undefined
      // validation: if historical mode, both dates must be provided and start < end
      if(mode === 'historical'){
        if(!start || !end){
          alert('Para modo histórico, completá Fecha hora desde y Fecha hora hasta.')
          return
        }
        const sd = new Date(start)
        const ed = new Date(end)
        if(Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime()) || sd >= ed){
          alert('Rango inválido: asegurate que Fecha hora desde sea anterior a Fecha hora hasta.')
          return
        }
      }
      // render React component into #chart-root
      import('./StockChart').then(mod => {
        const Chart = mod.default
        const root = document.getElementById('chart-root')
        if(!root) return
        root.innerHTML = ''
        const container = document.createElement('div')
        root.appendChild(container)
        import('react-dom/client').then(rdom=>{
          const rootNode = (rdom as any).createRoot(container)
          rootNode.render(React.createElement(Chart, { symbol: selectedItem.simbolo, mode, interval, start_date: start, end_date: end }))
        })
      })
    }
    plotBtn.addEventListener('click', handler)
    return ()=>{
      plotBtn.removeEventListener('click', handler)
      modeInputs.forEach(i=>i.removeEventListener('change', onModeChange))
    }
  }, [selectedItem])

  return (
    <div>
      <div style={{marginBottom:8}}>
        <label htmlFor="fav-select" style={{display:'block',fontWeight:600,marginBottom:4}}>Simbolos</label>
        <select id="fav-select" value={selectedSymbol||''} onChange={e=>setSelectedSymbol(e.target.value || null)} style={{padding:6,minWidth:200}} disabled={loading || items.length===0}>
          <option value="">-- Seleccioná un símbolo --</option>
          {items.map((s: any) => (
            <option key={s.simbolo} value={s.simbolo}>{s.simbolo}</option>
          ))}
        </select>
        {loading && <div style={{marginTop:8}}>Cargando favoritos...</div>}
        {!loading && items.length===0 && <div style={{marginTop:8,color:'rgba(0,0,0,0.6)'}}>No hay favoritos aún.</div>}
      </div>

      {detailLoading ? (
        <div>Cargando información...</div>
      ) : selectedItem ? (
        <div style={{border:'1px solid rgba(0,0,0,0.06)',padding:12,borderRadius:6}}>
          <h3 style={{margin:'0 0 8px 0'}}>Información de {selectedItem.simbolo}</h3>
          <div><strong>Nombre:</strong> {selectedItem.nombre || <em>Sin datos</em>}</div>
          <div><strong>Moneda:</strong> {selectedItem.moneda || <em>Sin datos</em>}</div>
          {selectedItem.region && <div><strong>Región:</strong> {selectedItem.region}</div>}
          {selectedItem.exchange && <div><strong>Exchange:</strong> {selectedItem.exchange}</div>}
          {selectedItem.tipo && <div><strong>Tipo:</strong> {selectedItem.tipo}</div>}

          {/* Chart controls */}
          <div style={{marginTop:12,borderTop:'1px solid rgba(0,0,0,0.03)',paddingTop:12}}>
            <div style={{marginBottom:8}}>
              <label style={{marginRight:12}}><input type="radio" name="chart-mode" defaultChecked value="realtime" /> Tiempo Real</label>
              <label><input type="radio" name="chart-mode" value="historical" style={{marginLeft:12}} /> Historico</label>
            </div>
            <div style={{marginBottom:8}}>
              <label style={{marginRight:8}}>Intervalo:</label>
              <select id="chart-interval" defaultValue="1min" style={{padding:6}}>
                <option value="1min">1min</option>
                <option value="5min">5min</option>
                <option value="15min">15min</option>
              </select>
            </div>
            <div id="historical-fields" style={{display:'none',marginBottom:8}}>
              <div style={{marginBottom:6}}>
                <label style={{display:'block'}}>Fecha hora desde</label>
                <input id="chart-start" type="datetime-local" />
              </div>
              <div>
                <label style={{display:'block'}}>Fecha hora hasta</label>
                <input id="chart-end" type="datetime-local" />
              </div>
            </div>
              <div>
                <button id="chart-plot" style={{padding:'8px 12px'}}>Graficar</button>
              </div>
              <div id="chart-root" style={{marginTop:12}} />
              {/* mount React chart here via container */}
          </div>
        </div>
      ) : (
        <div style={{color:'rgba(0,0,0,0.6)'}}>Seleccioná un símbolo para ver detalles.</div>
      )}
    </div>
  )
}
