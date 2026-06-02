import { useState, useRef, useEffect, useCallback } from 'react'
import { LineChart, Line, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type TestState = 'idle' | 'waiting' | 'ready' | 'complete' | 'start'

interface TestResult {
  reactionTime: number
}

const TOTAL_TESTS = 5

export function ReactionTest({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<TestState>('start')
  const [testNumber, setTestNumber] = useState(0)
  const [results, setResults] = useState<TestResult[]>([])
  const [testColor, setTestColor] = useState('rgb(100, 100, 100)')
  const [highScores] = useState<{ label: string; time: number }[]>([
    { label: '#1', time: 145 },
    { label: '#2', time: 162 },
    { label: '#3', time: 178 },
    { label: '#4', time: 189 },
    { label: '#5', time: 156 },
  ])
  const startTimeRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle click during test
  const handleClick = useCallback(() => {
    if (state === 'waiting') {
      setState('idle')
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    } else if (state === 'ready') {
      const reactionTime = Math.round(performance.now() - startTimeRef.current)
      setResults(prev => {
        const newResults = [...prev, { reactionTime }]
        if (newResults.length < TOTAL_TESTS) {
          setTestNumber(newResults.length)
          setState('idle')
        } else {
          setState('complete')
        }
        return newResults
      })
    }
  }, [state])

  // Timer for going from waiting to ready
  useEffect(() => {
    if (state === 'waiting') {
      const delay = Math.random() * 1000 + 500 // 0.5-1.5 seconds
      timeoutRef.current = setTimeout(() => {
        setTestColor('rgb(88, 214, 255)')
        setState('ready')
        startTimeRef.current = performance.now()
      }, delay)
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      }
    }
  }, [state])

  // Auto-start first test
  useEffect(() => {
    if (state === 'idle' && testNumber < TOTAL_TESTS) {
      setTestColor('rgb(100, 100, 100)')
      setState('waiting')
    }
  }, [state, testNumber])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        handleClick()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClick])

  const averageReaction = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.reactionTime, 0) / results.length)
    : 0

  return (
    <div className="reactTestContainer">
      <button type="button" className="reactTestBack" onClick={onBack}>
        ← back
      </button>

      {state === 'start' ? (
        <div className="reactTestStart" onClick={() => setState('idle')}>
          <div className="reactTestStartContent">
            <h1 className="reactTestStartTitle">Click to test your <span className="reactTestStartGreen">reaction time</span></h1>
          </div>
        </div>
      ) : (
        <div className="reactTestContent">
          <h1 className="reactTestTitle">Reaction Test</h1>

          {state === 'complete' ? (
            <div className="reactTestResults">
              <div className="reactTestResultsCard">
                <div className="reactTestAverage">
                  <div className="reactTestAverageLabel">Average</div>
                  <div className="reactTestAverageValue">{averageReaction}ms</div>
                </div>

                <div className="reactTestChart">
                  <div className="reactTestChartLabel">High Scores</div>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={highScores} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
                      <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} width={30} />
                      <Tooltip
                        contentStyle={{ background: 'rgba(3,8,18,0.95)', border: '1px solid rgba(88,214,255,0.2)', borderRadius: '4px', fontSize: 11 }}
                        formatter={(value) => `${value}ms`}
                      />
                      <Line type="monotone" dataKey="time" stroke="#58d6ff" dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="reactTestBreakdown">
                  <div className="reactTestBreakdownLabel">Your Results</div>
                  <div className="reactTestResultsList">
                    {results.map((result, i) => (
                      <div key={i} className="reactTestResultItem">
                        <span className="reactTestResultNumber">#{i + 1}</span>
                        <span className="reactTestResultTime">{result.reactionTime}ms</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="gxBtn isPrimary"
                  onClick={() => {
                    setTestNumber(0)
                    setResults([])
                    setState('start')
                  }}
                >
                  try again
                </button>
              </div>
            </div>
          ) : (
            <div className="reactTestArea" onClick={handleClick} style={{ backgroundColor: testColor }}>
              {state === 'waiting' && (
                <div className="reactTestInstruction">
                  <span>Ready to Click!</span>
                </div>
              )}
              {state === 'ready' && (
                <div className="reactTestInstruction reactTestGo">
                  <span>Now</span>
                </div>
              )}
              {/* {state === 'idle' && testNumber < TOTAL_TESTS && (
                <div className="reactTestInstruction">
                  <span>Click to start test {testNumber + 1} of {TOTAL_TESTS}</span>
                </div>
              )} */}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
