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

export const BUILT_IN_TASKS: TaskConfig[] = []
