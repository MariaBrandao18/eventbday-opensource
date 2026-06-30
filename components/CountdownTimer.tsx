'use client'

import { useEffect, useState } from 'react'

interface Props {
  targetDate: string
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export default function CountdownTimer({ targetDate }: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    // targetDate is always an ISO string with timezone (timestamptz).
    // Both sides of the comparison are UTC milliseconds — timezone-safe.
    const target = new Date(targetDate).getTime()

    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) {
        setStarted(true)
        setTimeLeft(null)
        return
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  if (started) {
    return <div className="cd-done">🎉 A festa começou! Bem-vindo(a)!</div>
  }

  // Render placeholder boxes before hydration to prevent layout shift.
  // suppressHydrationWarning is scoped to the dynamic number only.
  const cell = (n: number | null, label: string) => (
    <div className="cd-box" key={label}>
      <div className="cd-num" suppressHydrationWarning>
        {n === null ? '--' : String(n).padStart(2, '0')}
      </div>
      <div className="cd-lab">{label}</div>
    </div>
  )

  return (
    <div className="countdown">
      {cell(timeLeft?.days ?? null, 'Dias')}
      {cell(timeLeft?.hours ?? null, 'Horas')}
      {cell(timeLeft?.minutes ?? null, 'Min')}
      {cell(timeLeft?.seconds ?? null, 'Seg')}
    </div>
  )
}
