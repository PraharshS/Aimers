-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. Profiles table (one row per user)
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dpi           INTEGER NOT NULL DEFAULT 800,
  valorant_sens FLOAT   NOT NULL DEFAULT 0.5
);

-- If you already ran the schema without these columns, run this instead:
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dpi INTEGER NOT NULL DEFAULT 800;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS valorant_sens FLOAT NOT NULL DEFAULT 0.5;

-- 2. Scores table (one row per completed round)
CREATE TABLE IF NOT EXISTS public.scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id     TEXT NOT NULL,
  task_name   TEXT NOT NULL,
  score       INTEGER NOT NULL,
  hits        INTEGER NOT NULL DEFAULT 0,
  misses      INTEGER NOT NULL DEFAULT 0,
  accuracy    FLOAT NOT NULL DEFAULT 0,
  duration    INTEGER NOT NULL,   -- seconds
  played_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS scores_user_id_idx     ON public.scores(user_id);
CREATE INDEX IF NOT EXISTS scores_task_id_idx     ON public.scores(task_id);
CREATE INDEX IF NOT EXISTS scores_score_idx       ON public.scores(score DESC);
CREATE INDEX IF NOT EXISTS scores_played_at_idx   ON public.scores(played_at DESC);

-- 4. Row-Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores   ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, only owner can write
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Scores: anyone can read (leaderboard), only owner can insert
CREATE POLICY "scores_select" ON public.scores FOR SELECT USING (true);
CREATE POLICY "scores_insert" ON public.scores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Auto-create profile on sign-up (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
