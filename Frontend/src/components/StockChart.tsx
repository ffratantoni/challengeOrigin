import React, { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Tooltip,
  Legend,
} from 'chart.js'
import 'chartjs-adapter-date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Tooltip,
  Legend
)

type Props = {
  symbol: string
  mode: 'realtime' | 'historical'
  interval: '1min' | '5min' | '15min'
  onError?: (e: any) => void
  start_date?: string | undefined
  end_date?: string | undefined
}

export default function StockChart({ symbol, mode, interval, onError, start_date, end_date }: Props){
  const [loading, setLoading] = useState(false)
  const [labels, setLabels] = useState<string[]>([])
  const [values, setValues] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true)
      try{
        const qsObj: any = { symbol, mode, interval }
        if (start_date) qsObj.start_date = start_date
        if (end_date) qsObj.end_date = end_date
        const qs = new URLSearchParams(qsObj)
        const res = await fetch(`${(window as any).__VITE_API_URL__ || 'http://localhost:8000'}/stocks/timeseries?${qs.toString()}`)
        if(!res.ok){
          let text = await res.text()
          // try to parse provider error
          try{ const j = JSON.parse(text); if(j && j.message) text = j.message }catch{}
          throw new Error(text || 'Failed fetching time series')
        }
        const json = await res.json()
        if(!mounted) return
        // expect { timestamps: [...], values: [...] }
        setLabels(json.timestamps || [])
        setValues((json.values || []).map((v:number)=>Number(v)))
      }catch(e){
        const msg = (e && e.message) ? e.message : String(e)
        console.error('[StockChart] error', msg)
        setError(msg)
        if(onError) onError(e)
      }finally{ if(mounted) setLoading(false) }
    }
    load()
    return ()=>{ mounted = false }
  }, [symbol, mode, interval, start_date, end_date])

  if(loading) return <div>Cargando gráfico...</div>
  if(error) return <div style={{color:'crimson'}}>{error}</div>
  if(!labels.length) return <div>No hay datos para graficar.</div>

  const data = {
    labels: labels,
    datasets: [
      {
        label: `${symbol} (${interval})`,
        data: values,
        borderColor: 'rgba(33,150,243,1)',
        backgroundColor: 'rgba(33,150,243,0.1)',
        tension: 0.2,
        pointRadius: 0,
      }
    ]
  }

  const options: any = {
    scales: {
      x: {
        type: 'time',
        time: { unit: 'minute' }
      }
    }
  }

  return (
    <div style={{height:300}}>
      <Line data={data} options={options} />
    </div>
  )
}
