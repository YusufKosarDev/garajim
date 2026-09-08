/**
 * Auth context nesnesi ve onu okuyan hook.
 *
 * NEDEN AYRI DOSYA: Vite'ın Fast Refresh'i bir modül yalnızca bileşen export
 * ettiğinde çalışır. AuthContext.tsx hem `AuthProvider` bileşenini hem de
 * `useAuth` hook'unu export edince, dosyaya her dokunuşta hot update yerine
 * tam sayfa yenilemesi oluyordu (react-refresh/only-export-components).
 * Bileşen olmayan her şey burada; AuthContext.tsx'te yalnızca sağlayıcı kaldı.
 */
import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthContextValue {
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

export const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * useAuth - Auth Context'i kullanmak için hook.
 *
 * Kullanım:
 *   const { user, signIn, signOut } = useAuth()
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalı!')
  }
  return context
}
