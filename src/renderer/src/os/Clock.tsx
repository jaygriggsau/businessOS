import { useEffect, useState } from 'react'

export default function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 15)
    return () => clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })

  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-sm font-medium text-slate-100">{time}</span>
      <span className="text-[11px] text-slate-400">{date}</span>
    </div>
  )
}
