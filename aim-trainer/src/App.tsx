import { useState } from 'react'
import type { TaskConfig } from './types'
import AimTrainer from './components/AimTrainer'
import LandingPage from './components/LandingPage'
import './App.css'

export default function App() {
  const [activeTask, setActiveTask] = useState<TaskConfig | null>(null)

  if (activeTask) {
    return <AimTrainer task={activeTask} onBack={() => setActiveTask(null)} />
  }

  return <LandingPage onSelectTask={setActiveTask} />
}
