import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validação básica: o front nunca deve quebrar por falta de env vars.
// Sem elas, ficamos sem cliente e o restante do app decide o que fazer
// (ex.: cair para o modo simulação, ou reportar erro no hook de dados reais).
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas. ' +
      'Copie .env.example para .env.local e preencha os valores do projeto Bike_GM.',
  )
}

// Cliente único do Supabase, usado tanto para a leitura inicial quanto
// para a subscription de Realtime. Nunca use a service_role key aqui —
// somente a anon key, pública por natureza (client-side).
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null
