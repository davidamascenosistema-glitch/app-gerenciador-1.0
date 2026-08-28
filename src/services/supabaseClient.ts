import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * ============================================================================
 * SUPABASE CLIENT CONFIGURATION
 * ============================================================================
 * Para que a conexão com o Supabase funcione na plataforma Google AI Studio
 * ou em qualquer ambiente de implantação, cadastre exatamente as seguintes
 * variáveis de ambiente nas Configurações do Projeto (Settings / Secrets):
 *
 * 1. VITE_SUPABASE_URL
 *    -> Project URL do Supabase (ex: "https://abcdefghijklmnopqrst.supabase.co")
 *
 * 2. VITE_SUPABASE_ANON_KEY
 *    -> Chave pública anônima do Supabase (Project Settings > API > anon public)
 * ============================================================================
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Verifica se as credenciais do Supabase foram configuradas via variáveis de ambiente.
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.trim().length > 0 &&
    supabaseAnonKey &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseUrl.includes('placeholder')
  );
};

// Inicialização do cliente com os valores de ambiente fornecidos
const effectiveUrl = supabaseUrl || '';
const effectiveKey = supabaseAnonKey || '';

export const supabase: SupabaseClient = createClient(
  effectiveUrl || 'https://supabase.local',
  effectiveKey || 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
