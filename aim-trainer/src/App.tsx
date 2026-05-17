import { useState } from 'react'
import type { TaskConfig } from './types'
import { AuthProvider } from './context/AuthContext'
import AimTrainer from './components/AimTrainer'
import LandingPage from './components/LandingPage'
import ProfilePage from './components/ProfilePage'
import Leaderboard from './components/Leaderboard'
import TaskCreator from './components/TaskCreator'
import { saveCustomTask } from './taskStorage'
import './App.css'

type AppView = 'landing' | 'game' | 'profile' | 'leaderboard'

export default function App() {
  const [view, setView]               = useState<AppView>('landing')
  const [activeTask, setActiveTask]   = useState<TaskConfig | null>(null)
  const [testDraft, setTestDraft]     = useState<TaskConfig | null>(null)
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [landingKey, setLandingKey]   = useState(0)

  const runningTask = testDraft ?? activeTask

  const handleBack = () => {
    setTestDraft(null)
    setActiveTask(null)
    setView('landing')
  }

  const handleSelectTask = (task: TaskConfig) => {
    setActiveTask(task)
    setView('game')
  }

  const handleCreatorSave = (task: TaskConfig) => {
    saveCustomTask(task)
    setCreatorOpen(false)
    setTestDraft(null)
    setActiveTask(null)
    setView('landing')
    setLandingKey(k => k + 1)
  }

  const handleCreatorClose = () => {
    setCreatorOpen(false)
    setTestDraft(null)
  }

  return (
    <AuthProvider>
      {view === 'game' && runningTask ? (
        <AimTrainer task={runningTask} onBack={handleBack} />
      ) : view === 'profile' ? (
        <ProfilePage onBack={() => setView('landing')} />
      ) : view === 'leaderboard' ? (
        <Leaderboard onBack={() => setView('landing')} />
      ) : (
        <LandingPage
          key={landingKey}
          onSelectTask={handleSelectTask}
          onOpenCreator={() => setCreatorOpen(true)}
          onViewProfile={() => setView('profile')}
          onViewLeaderboard={() => setView('leaderboard')}
        />
      )}

      {creatorOpen && (
        <TaskCreator
          onSave={handleCreatorSave}
          onClose={handleCreatorClose}
          onTest={setTestDraft}
        />
      )}
    </AuthProvider>
  )
}
