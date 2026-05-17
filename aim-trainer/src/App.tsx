import { useState } from 'react'
import type { TaskConfig } from './types'
import AimTrainer from './components/AimTrainer'
import LandingPage from './components/LandingPage'
import TaskCreator from './components/TaskCreator'
import { saveCustomTask } from './taskStorage'
import './App.css'

export default function App() {
  const [activeTask, setActiveTask]   = useState<TaskConfig | null>(null)
  const [testDraft, setTestDraft]     = useState<TaskConfig | null>(null)
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [landingKey, setLandingKey]   = useState(0)

  // testDraft drives the game while creator is open in test mode
  const runningTask = testDraft ?? activeTask

  const handleBack = () => {
    setTestDraft(null)
    setActiveTask(null)
  }

  const handleCreatorSave = (task: TaskConfig) => {
    saveCustomTask(task)
    setCreatorOpen(false)
    setTestDraft(null)
    setActiveTask(null)
    setLandingKey(k => k + 1)   // re-mount LandingPage so it reloads the task list
  }

  const handleCreatorClose = () => {
    setCreatorOpen(false)
    setTestDraft(null)
  }

  return (
    <>
      {runningTask ? (
        <AimTrainer task={runningTask} onBack={handleBack} />
      ) : (
        <LandingPage
          key={landingKey}
          onSelectTask={setActiveTask}
          onOpenCreator={() => setCreatorOpen(true)}
        />
      )}

      {creatorOpen && (
        <TaskCreator
          onSave={handleCreatorSave}
          onClose={handleCreatorClose}
          onTest={setTestDraft}
        />
      )}
    </>
  )
}
