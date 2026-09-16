import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Public client — used in frontend/browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client — used only in server-side API routes (never sent to browser)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SECRET_KEY
)
