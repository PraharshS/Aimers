export type MovementType = 'stationary' | 'horizontal' | 'vertical' | '2d'

export type TaskConfig = {
  id: string
  name: string
  icon: string          // FA icon name without prefix, e.g. 'crosshairs'
  description: string
  tags: string[]
  isCustom?: boolean

  // Visual
  targetColor: string   // hex

  // Target
  targetSize: number    // base radius multiplier 0.6–2.2
  targetDepth: number   // 3D depth variation 0.8–3.0
  maxTargets: number    // simultaneous targets 1–5
  targetLifetime: number // seconds before auto-despawn; 0 = never

  // Spawn
  spawnDistance: number  // fraction of screen radius 0.1–0.6
  spawnDelay: number     // ms between targets after kill/miss 100–1500

  // Movement
  movementType: MovementType
  movementSpeed: number  // 0–200; controls amplitude & frequency of oscillation

  // Round
  roundDuration: number  // seconds: 15 | 30 | 60 | 90
  hitScore: number
  missPenalty: number
}

export const DEFAULT_TASK_VALUES: Omit<TaskConfig, 'id' | 'name'> = {
  icon: 'crosshairs',
  description: '',
  tags: [],
  isCustom: true,
  targetColor: '#58d6ff',
  targetSize: 1.0,
  targetDepth: 1.5,
  maxTargets: 1,
  targetLifetime: 0,
  spawnDistance: 0.36,
  spawnDelay: 450,
  movementType: 'stationary',
  movementSpeed: 0,
  roundDuration: 30,
  hitScore: 10,
  missPenalty: 3,
}

export const BUILT_IN_TASKS: TaskConfig[] = [
  {
    id: 'tracking',
    name: 'Tracking',
    icon: 'crosshairs',
    description: 'Keep your crosshair on a continuously moving target.',
    tags: ['Accuracy', 'Control'],
    targetColor: '#58d6ff',
    targetSize: 1.2,
    targetDepth: 1.5,
    maxTargets: 1,
    targetLifetime: 0,
    spawnDistance: 0.36,
    spawnDelay: 300,
    movementType: '2d',
    movementSpeed: 80,
    roundDuration: 30,
    hitScore: 10,
    missPenalty: 3,
  },
  {
    id: 'flicking',
    name: 'Flicking',
    icon: 'bolt',
    description: 'Snap to targets that appear at random positions as fast as possible.',
    tags: ['Speed', 'Reaction'],
    targetColor: '#ff6b6b',
    targetSize: 0.9,
    targetDepth: 1.2,
    maxTargets: 1,
    targetLifetime: 2,
    spawnDistance: 0.45,
    spawnDelay: 200,
    movementType: 'stationary',
    movementSpeed: 0,
    roundDuration: 30,
    hitScore: 10,
    missPenalty: 5,
  },
  {
    id: 'gridshot',
    name: 'Grid Shot',
    icon: 'border-all',
    description: 'Clear multiple simultaneous targets spread across a wide area.',
    tags: ['Rhythm', 'Accuracy'],
    targetColor: '#a8ff78',
    targetSize: 1.0,
    targetDepth: 1.0,
    maxTargets: 3,
    targetLifetime: 0,
    spawnDistance: 0.5,
    spawnDelay: 250,
    movementType: 'stationary',
    movementSpeed: 0,
    roundDuration: 30,
    hitScore: 10,
    missPenalty: 2,
  },
  {
    id: 'precision',
    name: 'Precision',
    icon: 'circle-dot',
    description: 'Hit small, stationary targets. Every miss costs you.',
    tags: ['Accuracy', 'Focus'],
    targetColor: '#ffd700',
    targetSize: 0.65,
    targetDepth: 1.8,
    maxTargets: 1,
    targetLifetime: 0,
    spawnDistance: 0.3,
    spawnDelay: 500,
    movementType: 'stationary',
    movementSpeed: 0,
    roundDuration: 30,
    hitScore: 15,
    missPenalty: 8,
  },
  {
    id: 'speed',
    name: 'Speed Shot',
    icon: 'gauge-high',
    description: 'Large targets spawn rapidly — maximize clicks per second.',
    tags: ['Speed', 'Volume'],
    targetColor: '#ff9f43',
    targetSize: 1.8,
    targetDepth: 1.0,
    maxTargets: 2,
    targetLifetime: 1.5,
    spawnDistance: 0.36,
    spawnDelay: 100,
    movementType: 'stationary',
    movementSpeed: 0,
    roundDuration: 30,
    hitScore: 5,
    missPenalty: 1,
  },
  {
    id: 'microflick',
    name: 'Micro-Flick',
    icon: 'location-crosshairs',
    description: 'Tiny targets, minimal distance — train fine motor precision.',
    tags: ['Precision', 'Control'],
    targetColor: '#ee5a24',
    targetSize: 0.6,
    targetDepth: 2.0,
    maxTargets: 1,
    targetLifetime: 3,
    spawnDistance: 0.2,
    spawnDelay: 350,
    movementType: 'stationary',
    movementSpeed: 0,
    roundDuration: 30,
    hitScore: 20,
    missPenalty: 10,
  },
]
