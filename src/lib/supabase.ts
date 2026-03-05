import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = 'https://pwdbjqfpgumyfktbfswg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZGJqcWZwZ3VteWZrdGJmc3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTc0MjAsImV4cCI6MjA4NzU3MzQyMH0.rLUoTNev2CVDswBAVoS2PT0xGvXbNDv7FKbDJ8i29Ws'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
