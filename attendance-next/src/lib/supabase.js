import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qbbzflvmmiahxldqzckp.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_c-m2osEWNoPbzSzewmYoyg_rlwVizBA'

// Public client — used in frontend/browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
