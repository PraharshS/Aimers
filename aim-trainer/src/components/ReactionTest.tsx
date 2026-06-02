import { useState, useRef, useEffect } from 'react'

type TestState = 'idle' | 'waiting' | 'ready' | 'testing' | 'complete'

interface TestResult {
  reactionTime: number
}

const TOTAL_TESTS = 5

export function ReactionTest({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<TestState>('idle')
  const [testNumber, setTestNumber] = useState(0)
  const [results, setResults] = useState<TestResult[]>([])
  const [testColor, setTestColor] = useState('rgb(100, 100, 100)')
  const startTimeRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Start a new test
  const startTest = () => {
    setTestColor('rgb(100, 100, 100)')
    setState('waiting')
    const delay = Math.random() * 2000 + 1000 // 1-3 seconds
    const timeout = setTimeout(() => {
      setTestColor('rgb(88, 214, 255)')
      setState('ready')
      startTimeRef.current = performance.now()
    }, delay)
    return () => clearTimeout(timeout)
  }

  // Handle click during test
  const handleClick = () => {
    if (state === 'waiting') {
      setState('idle')
    } else if (state === 'ready') {
      const reactionTime = Math.round(performance.now() - startTimeRef.current)
      const newResults = [...results, { reactionTime }]
      setResults(newResults)

      if (newResults.length < TOTAL_TESTS) {
        setTestNumber(newResults.length)
        setState('idle')
      } else {
        setState('complete')
      }
    }
  }

  // Auto-start first test
  useEffect(() => {
    if (state === 'idle' && testNumber < TOTAL_TESTS) {
      const cleanup = startTest()
      return cleanup
    }
  }, [state, testNumber])

  // Handle click anywhere on the container
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        handleClick()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state])

  const averageReaction = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.reactionTime, 0) / results.length)
    : 0

  return (
    <div className="reactTestContainer">
      <button type="button" className="reactTestBack" onClick={onBack}>
        ← back
      </button>

      <div className="reactTestContent">
        <h1 className="reactTestTitle">Reaction Test</h1>

        {state === 'complete' ? (
          <div className="reactTestResults">
            <div className="reactTestResultsCard">
              <div className="reactTestAverage">
                <div className="reactTestAverageLabel">Average</div>
                <div className="reactTestAverageValue">{averageReaction}ms</div>
              </div>

              <div className="reactTestBreakdown">
                <div className="reactTestBreakdownLabel">Results</div>
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
                  setState('idle')
                }}
              >
                try again
              </button>
            </div>
          </div>
        ) : (
          <div className="reactTestArea" ref={containerRef} onClick={handleClick} style={{ backgroundColor: testColor }}>
            {state === 'waiting' && (
              <div className="reactTestInstruction">
                <span>Wait for green...</span>
              </div>
            )}
            {state === 'ready' && (
              <div className="reactTestInstruction reactTestGo">
                <span>GO!</span>
              </div>
            )}
            {state === 'idle' && testNumber < TOTAL_TESTS && (
              <div className="reactTestInstruction">
                <span>Click to start test {testNumber + 1} of {TOTAL_TESTS}</span>
              </div>
            )}

            <div className="reactTestProgress">
              {Array.from({ length: TOTAL_TESTS }).map((_, i) => (
                <div
                  key={i}
                  className={`reactTestDot ${i < testNumber ? 'isDone' : i === testNumber && state !== 'idle' ? 'isActive' : ''}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
