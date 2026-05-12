import { useState } from 'react'
import type { MovementType, TaskConfig } from '../types'
import { DEFAULT_TASK_VALUES } from '../types'
import { saveCustomTask } from '../taskStorage'

const ICONS = [
  'crosshairs', 'bolt', 'border-all', 'circle-dot', 'gauge-high',
  'location-crosshairs', 'bullseye', 'fire', 'star', 'shield-halved',
  'brain', 'eye', 'dumbbell', 'trophy', 'bomb', 'wand-magic-sparkles',
]

const SIZE_PRESETS = [
  { label: 'Tiny', value: 0.6 },
  { label: 'Small', value: 0.85 },
  { label: 'Medium', value: 1.0 },
  { label: 'Large', value: 1.5 },
  { label: 'Huge', value: 2.2 },
]

const LIFETIME_PRESETS = [
  { label: '0.5s', value: 0.5 },
  { label: '1s', value: 1 },
  { label: '2s', value: 2 },
  { label: '3s', value: 3 },
  { label: 'Never', value: 0 },
]

const DURATION_OPTIONS = [15, 30, 60, 90]

type Props = {
  initialTask?: TaskConfig | null
  onSave: (task: TaskConfig) => void
  onClose: () => void
}

export default function TaskCreator({ initialTask, onSave, onClose }: Props) {
  const base = initialTask ?? { ...DEFAULT_TASK_VALUES, id: '', name: '' }

  const [name, setName] = useState(base.name)
  const [icon, setIcon] = useState(base.icon)
  const [color, setColor] = useState(base.targetColor)
  const [targetSize, setTargetSize] = useState(base.targetSize)
  const [maxTargets, setMaxTargets] = useState(base.maxTargets)
  const [targetLifetime, setTargetLifetime] = useState(base.targetLifetime)
  const [spawnDistance, setSpawnDistance] = useState(base.spawnDistance)
  const [spawnDelay, setSpawnDelay] = useState(base.spawnDelay)
  const [movementType, setMovementType] = useState<MovementType>(base.movementType)
  const [movementSpeed, setMovementSpeed] = useState(base.movementSpeed)
  const [roundDuration, setRoundDuration] = useState(base.roundDuration)
  const [hitScore, setHitScore] = useState(base.hitScore)
  const [missPenalty, setMissPenalty] = useState(base.missPenalty)

  const handleSave = () => {
    if (!name.trim()) return
    const task: TaskConfig = {
      id: initialTask?.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      icon,
      description: '',
      tags: deriveTags(),
      isCustom: true,
      targetColor: color,
      targetSize,
      targetDepth: DEFAULT_TASK_VALUES.targetDepth,
      maxTargets,
      targetLifetime,
      spawnDistance,
      spawnDelay,
      movementType,
      movementSpeed: movementType === 'stationary' ? 0 : movementSpeed,
      roundDuration,
      hitScore,
      missPenalty,
    }
    saveCustomTask(task)
    onSave(task)
  }

  const deriveTags = (): string[] => {
    const tags: string[] = []
    if (movementType !== 'stationary') tags.push('Moving')
    if (targetSize <= 0.75) tags.push('Precision')
    else if (targetSize >= 1.5) tags.push('Speed')
    if (spawnDelay <= 200) tags.push('Rapid')
    if (targetLifetime > 0 && targetLifetime <= 1.5) tags.push('Reaction')
    if (maxTargets >= 3) tags.push('Multi-target')
    return tags.length ? tags : ['Custom']
  }

  return (
    <div className="taskCreatorOverlay" onClick={onClose}>
      <div className="taskCreator" onClick={(e) => e.stopPropagation()}>
        <div className="taskCreatorHeader">
          <span>{initialTask ? 'Edit Task' : 'Create Task'}</span>
          <button type="button" className="aimModalClose" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="taskCreatorBody">
          {/* Identity */}
          <section className="tcSection">
            <h3 className="tcSectionTitle">Identity</h3>
            <div className="tcRow">
              <label className="tcLabel">Name</label>
              <input
                className="tcInput"
                type="text"
                placeholder="e.g. Micro tracking"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
              />
            </div>
            <div className="tcRow">
              <label className="tcLabel">Color</label>
              <input
                className="tcColorInput"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
            <div className="tcRow tcRowCol">
              <label className="tcLabel">Icon</label>
              <div className="tcIconGrid">
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    className={`tcIconOpt ${icon === ic ? 'isActive' : ''}`}
                    style={icon === ic ? { borderColor: color, color } : {}}
                    onClick={() => setIcon(ic)}
                    aria-label={ic}
                  >
                    <i className={`fa-solid fa-${ic}`} />
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Targets */}
          <section className="tcSection">
            <h3 className="tcSectionTitle">Targets</h3>
            <div className="tcRow tcRowCol">
              <label className="tcLabel">Size</label>
              <div className="tcToggleGroup">
                {SIZE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className={`tcToggle ${targetSize === p.value ? 'isActive' : ''}`}
                    style={targetSize === p.value ? { borderColor: color, color } : {}}
                    onClick={() => setTargetSize(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="tcRow tcRowCol">
              <label className="tcLabel">Max simultaneous targets</label>
              <div className="tcToggleGroup">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`tcToggle ${maxTargets === n ? 'isActive' : ''}`}
                    style={maxTargets === n ? { borderColor: color, color } : {}}
                    onClick={() => setMaxTargets(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="tcRow tcRowCol">
              <label className="tcLabel">Target lifetime (auto-despawn)</label>
              <div className="tcToggleGroup">
                {LIFETIME_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className={`tcToggle ${targetLifetime === p.value ? 'isActive' : ''}`}
                    style={targetLifetime === p.value ? { borderColor: color, color } : {}}
                    onClick={() => setTargetLifetime(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Spawn */}
          <section className="tcSection">
            <h3 className="tcSectionTitle">Spawn</h3>
            <div className="tcRow">
              <label className="tcLabel">Spawn area</label>
              <div className="tcSliderWrap">
                <span className="tcSliderHint">Tight</span>
                <input
                  type="range"
                  min="0.1"
                  max="0.6"
                  step="0.05"
                  value={spawnDistance}
                  onChange={(e) => setSpawnDistance(Number(e.target.value))}
                />
                <span className="tcSliderHint">Wide</span>
              </div>
            </div>
            <div className="tcRow">
              <label className="tcLabel">Spawn delay after kill</label>
              <div className="tcSliderWrap">
                <span className="tcSliderHint">100ms</span>
                <input
                  type="range"
                  min="100"
                  max="1500"
                  step="50"
                  value={spawnDelay}
                  onChange={(e) => setSpawnDelay(Number(e.target.value))}
                />
                <span className="tcSliderHint">{spawnDelay}ms</span>
              </div>
            </div>
          </section>

          {/* Movement */}
          <section className="tcSection">
            <h3 className="tcSectionTitle">Movement</h3>
            <div className="tcRow tcRowCol">
              <label className="tcLabel">Type</label>
              <div className="tcToggleGroup">
                {(['stationary', 'horizontal', 'vertical', '2d'] as MovementType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`tcToggle ${movementType === t ? 'isActive' : ''}`}
                    style={movementType === t ? { borderColor: color, color } : {}}
                    onClick={() => setMovementType(t)}
                  >
                    {t === '2d' ? '2D' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {movementType !== 'stationary' && (
              <div className="tcRow">
                <label className="tcLabel">Speed</label>
                <div className="tcSliderWrap">
                  <span className="tcSliderHint">Slow</span>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    step="10"
                    value={movementSpeed}
                    onChange={(e) => setMovementSpeed(Number(e.target.value))}
                  />
                  <span className="tcSliderHint">{movementSpeed}</span>
                </div>
              </div>
            )}
          </section>

          {/* Round & Scoring */}
          <section className="tcSection">
            <h3 className="tcSectionTitle">Round &amp; Scoring</h3>
            <div className="tcRow tcRowCol">
              <label className="tcLabel">Duration</label>
              <div className="tcToggleGroup">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`tcToggle ${roundDuration === d ? 'isActive' : ''}`}
                    style={roundDuration === d ? { borderColor: color, color } : {}}
                    onClick={() => setRoundDuration(d)}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div className="tcRow tcScoringRow">
              <div className="tcScoreField">
                <label className="tcLabel">Hit score</label>
                <input
                  className="tcNumInput"
                  type="number"
                  min="1"
                  max="100"
                  value={hitScore}
                  onChange={(e) => setHitScore(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div className="tcScoreField">
                <label className="tcLabel">Miss penalty</label>
                <input
                  className="tcNumInput"
                  type="number"
                  min="0"
                  max="100"
                  value={missPenalty}
                  onChange={(e) => setMissPenalty(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="taskCreatorFooter">
          <button type="button" className="aimModalResetBtn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="aimModalApplyBtn"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            {initialTask ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
