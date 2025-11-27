import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Esta línea nos ayudará a ver en la consola si está leyendo el archivo
console.log("Supabase URL cargada:", supabaseUrl); 

export const supabase = createClient(supabaseUrl, supabaseAnonKey)