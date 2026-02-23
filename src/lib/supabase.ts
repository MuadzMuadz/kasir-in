import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uzyzqjwxaqellztmgxxy.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_zWNPd2WFMK5EWC5IR8siSQ_O1MOCVGn'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
