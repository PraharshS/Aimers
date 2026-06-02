import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Env check
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] ❌ Missing env vars. Make sure .env.local contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
} else {
  console.info(`[Supabase] 🔗 Connecting to ${supabaseUrl}`)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Connectivity ping — run once on app startup
let pingRun = false
export function pingSupabase() {
  if (pingRun) return
  pingRun = true
  supabase.from('profiles').select('id').limit(1).then(({ error }) => {
    if (error) {
      console.error('[Supabase] ❌ Connection failed:', error.message)
    } else {
      console.info('[Supabase] ✅ Connected successfully')
    }
  })
}

export type Profile = {
  id: string
  username: string
  created_at: string
  dpi: number
  valorant_sens: number
  avatar_url?: string
}

export type ScoreRow = {
  id: string
  user_id: string
  task_id: string
  task_name: string
  score: number
  hits: number
  misses: number
  accuracy: number
  duration: number
  played_at: string
  profiles?: { username: string }
}

export type ScoreInsert = Omit<ScoreRow, 'id' | 'played_at' | 'profiles'>
