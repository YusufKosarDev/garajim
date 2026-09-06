import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'
import type { ReactNode } from 'react'

export interface AuthContextDegeri {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ data: unknown; error: unknown }>
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: unknown }>
  signInWithGoogle: () => Promise<{ data: unknown; error: unknown }>
  signOut: () => Promise<{ error: unknown }>
  resetPassword: (email: string) => Promise<{ data: unknown; error: unknown }>
  isAuthenticated: boolean
}

// Context oluştur
const AuthContext = createContext<AuthContextDegeri | null>(null)

/**
 * AuthProvider - Tüm uygulamayı sarar, auth state'ini sağlar.
 *
 * Kullanım:
 *   <AuthProvider>
 *     <App />
 *   </AuthProvider>
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // İlk yüklemede mevcut session'ı kontrol et
  useEffect(() => {
    // 1. Mevcut session'ı al
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 2. Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    // 3. Cleanup (component unmount olunca)
    return () => subscription.unsubscribe()
  }, [])

  // Auth fonksiyonları
  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  /**
   * Google OAuth ile giriş yap.
   * 
   * Kullanıcı Google izin ekranına yönlendirilir, izin verirse
   * uygulamaya geri döner ve otomatik olarak login olur.
   * 
   * @returns {Promise<{ data, error }>}
   */
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
  }

  // Context value
  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuth - Auth Context'i kullanmak için hook.
 *
 * Kullanım:
 *   const { user, signIn, signOut } = useAuth()
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalı!')
  }
  return context
}