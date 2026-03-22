import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = 'https://vlrviyrgggzhayepfmop.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZscnZpeXJnZ2d6aGF5ZXBmbW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIyNzYsImV4cCI6MjA4ODE1ODI3Nn0.pvcZqzAm-ARWVsSv6hKUnTwZeggVJcwYN---4jUfyA0'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
