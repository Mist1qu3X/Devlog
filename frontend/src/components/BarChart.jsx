// Горизонтальный бар-чарт на чистом CSS с анимацией роста при появлении.
import { useEffect, useState } from 'react'

export default function BarChart({ data }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60)
    return () => clearTimeout(t)
  }, [data])

  if (!data || data.length === 0) {
    return <p className="hint">Нет данных.</p>
  }
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div>
      {data.map((d, i) => (
        <div className="bar-row" key={i}>
          <span className="bar-label" title={d.label}>{d.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: shown ? `${(d.value / max) * 100}%` : 0 }} />
          </div>
          <span className="bar-val">{d.value}</span>
        </div>
      ))}
    </div>
  )
}
