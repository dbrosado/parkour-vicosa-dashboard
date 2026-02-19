import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getEmailDomain, securityDebugLog } from './security-debug'
import { supabase } from './supabase'

export type UserRole = 'admin' | 'instructor'

interface Profile {
  id: string
  email: string
  name: string
  role: UserRole
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      securityDebugLog('auth.profile_fetch_failed', {
        userId,
        code: error.code,
        message: error.message,
      })
      return null
    }

    securityDebugLog('auth.profile_loaded', {
      userId,
      role: (data as Profile | null)?.role ?? null,
    })

    return data as Profile | null
  }, [])

  useEffect(() => {
    if (!supabase) {
      securityDebugLog('auth.supabase_unconfigured_offline_mode')
      setLoading(false)
      return
    }

    securityDebugLog('auth.session_init_start')

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      securityDebugLog('auth.session_init_result', {
        hasSession: Boolean(s),
        userId: s?.user?.id ?? null,
      })

      setSession(s)
      if (s?.user) {
        const p = await fetchProfile(s.user.id)
        if (!p) {
          securityDebugLog('auth.profile_missing_after_session_init', {
            userId: s.user.id,
          })
        }
        setProfile(p)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      securityDebugLog('auth.state_change', {
        event: _event,
        hasSession: Boolean(s),
        userId: s?.user?.id ?? null,
      })

      setSession(s)
      if (s?.user) {
        const p = await fetchProfile(s.user.id)
        if (!p) {
          securityDebugLog('auth.profile_missing_after_state_change', {
            userId: s.user.id,
            event: _event,
          })
        }
        setProfile(p)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: 'Supabase not configured' }

      securityDebugLog('auth.sign_in_attempt', {
        emailDomain: getEmailDomain(email),
      })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        securityDebugLog('auth.sign_in_failed', {
          emailDomain: getEmailDomain(email),
          code: error.code,
          status: error.status,
          message: error.message,
        })
      } else {
        securityDebugLog('auth.sign_in_success', {
          userId: data.user?.id ?? null,
        })
      }

      return { error: error?.message ?? null }
    },
    [],
  )

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    securityDebugLog('auth.sign_out')
    setSession(null)
    setProfile(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      profile,
      session,
      loading,
      isAdmin: profile?.role === 'admin',
      signIn,
      signOut,
    }),
    [session, profile, loading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
