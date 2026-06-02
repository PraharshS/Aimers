import { useEffect, useState } from 'react'

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => {
        onComplete()
      }, 600) // Duration of slide-up animation
    }, 2500) // 2.5 seconds on splash screen

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className={`splashScreen ${isExiting ? 'isExiting' : ''}`}>
      <div className="splashContent">
        <h1 className="splashTitle">TEST YOUR <span className="splashGreen">AIM</span></h1>
        <p className="splashSubtitle">AIMERS</p>
      </div>
    </div>
  )
}
