import React, { useState, useRef, useEffect } from 'react'
import { getUsernameFromToken } from '../api'

export default function LandingPage() {
  const username = getUsernameFromToken() || 'Invitado'
  const [active, setActive] = useState<'mis'|'trade'|'transfer'|'stocks'>('mis')
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [bannerWidth, setBannerWidth] = useState<number | null>(null)

  useEffect(()=>{
    function measure(){
      const menuW = menuRef.current?.offsetWidth || 0
      const desired = Math.min(window.innerWidth - 32, menuW * 2)
      setBannerWidth(desired || null)
    }
    measure()
    window.addEventListener('resize', measure)
    return ()=> window.removeEventListener('resize', measure)
  }, [])

  return (
    <div>
      <header className="app-header">
        <div style={{display:'flex',alignItems:'center'}}>
          <div>Hola, <strong>{username}</strong></div>
        </div>
      </header>

      <div className="banner" style={bannerWidth ? {width: bannerWidth, margin: '1rem auto'} : {margin: '1rem auto'}}>
        <div className="banner-content">
          <div className="banner-inner">
            <svg className="logo" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect width="48" height="48" rx="10" fill="white" />
              <path d="M12 34 L22 18 L30 26 L36 14" stroke="#0a69ff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2>Origin Trading</h2>
          </div>
        </div>
      </div>

      <nav className="main-menu" ref={menuRef}>
        <button className={active==='mis'? 'menu-item active':'menu-item'} onClick={()=>setActive('mis')}>Mis Acciones</button>
        <button className={active==='stocks'? 'menu-item active':'menu-item'} onClick={()=>setActive('stocks')}>Stocks</button>
        <button className={active==='trade'? 'menu-item active':'menu-item'} onClick={()=>setActive('trade')}>Compra/Venta</button>
        <button className={active==='transfer'? 'menu-item active':'menu-item'} onClick={()=>setActive('transfer')}>Transferencias</button>
      </nav>

      <main style={{padding:'1rem'}}>
        <div className="card">
          {active==='stocks' && <div><h3>Stocks</h3><p>Explora símbolos y cotizaciones (contenido de ejemplo).</p></div>}
          {active==='mis' && <div><h3>Mis Acciones</h3><p>Listado de tus acciones (contenido de ejemplo).</p></div>}
          {active==='trade' && <div><h3>Compra / Venta</h3><p>Formulario de compra/venta (por implementar).</p></div>}
          {active==='transfer' && <div><h3>Transferencias</h3><p>Gestiona transferencias entre cuentas.</p></div>}
        </div>
      </main>
    </div>
  )
}
