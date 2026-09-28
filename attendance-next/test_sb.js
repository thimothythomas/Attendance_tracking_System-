import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({path: '.env.local'})
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
async function test() {
  const { data, error } = await supabase.from('shifts').select('*')
  console.log("Shifts data:", data, "Error:", error)
}
test()
