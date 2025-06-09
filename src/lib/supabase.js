import { createClient } from "@supabase/supabase-js"

const supabaseUrl = 'https://osvmxkhnakuhxhzdheoz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdm14a2huYWt1aHhoemRoZW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0OTg0MDcsImV4cCI6MjA2NTA3NDQwN30.qHYgGJPdGk47wz2NWoqQ6ynKsr_5_TlEhsQGvqTg3V4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)