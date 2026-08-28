import { useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
}

/**
 * Traduz mensagens de erro comuns do Supabase Auth para mensagens claras em português.
 */
export function formatAuthError(error: AuthError | Error | null): string {
  if (!error) return '';
  const msg = error.message?.toLowerCase() || '';

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'E-mail ou senha incorretos. Verifique os dados digitados.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'Este e-mail já está cadastrado. Tente entrar na sua conta.';
  }
  if (msg.includes('password should be at least') || msg.includes('weak_password')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }
  if (msg.includes('email not confirmed')) {
    return 'E-mail não confirmado. Verifique sua caixa de entrada ou spam.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Muitas tentativas consecutivas. Aguarde alguns instantes.';
  }
  if (msg.includes('invalid email') || msg.includes('valid email')) {
    return 'Por favor, insira um formato de e-mail válido.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Falha de conexão. Verifique sua internet ou a URL do Supabase.';
  }

  return error.message || 'Ocorreu um erro ao processar a autenticação.';
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    let isMounted = true;

    // Se o Supabase não estiver configurado com credenciais válidas, encerra o loading
    if (!configured) {
      setLoading(false);
      return;
    }

    // 1. Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (isMounted) {
        if (!error && session) {
          setSession(session);
          setUser(session.user);
        } else {
          setSession(null);
          setUser(null);
        }
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    });

    // 2. Escutar mudanças de estado de autenticação em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!configured) {
        return {
          error: 'Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas configurações.',
        };
      }

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          return { error: formatAuthError(error) };
        }

        return { error: null };
      } catch (err: any) {
        return { error: formatAuthError(err) };
      }
    },
    [configured]
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error: string | null; needsEmailConfirmation?: boolean }> => {
      if (!configured) {
        return {
          error: 'Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas configurações.',
        };
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          return { error: formatAuthError(error) };
        }

        // Se o Supabase exigir confirmação por e-mail e não retornar uma sessão imediata:
        const needsEmailConfirmation = Boolean(data.user && !data.session);

        return { error: null, needsEmailConfirmation };
      } catch (err: any) {
        return { error: formatAuthError(err) };
      }
    },
    [configured]
  );

  const signOut = useCallback(async (): Promise<void> => {
    if (!configured) {
      setUser(null);
      setSession(null);
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // Mesmo com erro de rede, limpa a sessão localmente
      setUser(null);
      setSession(null);
    }
  }, [configured]);

  return {
    user,
    session,
    loading,
    isConfigured: configured,
    signInWithPassword,
    signUp,
    signOut,
  };
}
