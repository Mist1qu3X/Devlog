// Небольшая анимация «набегающего» числа от 0 до target.
import { useEffect, useState } from 'react'

export default function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf
    const start = performance.now()
    function tick(now) {
      const p = Math.min((now - start) / duration, 1)
      // плавное замедление
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}
