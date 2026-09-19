import { flushData } from './data-sync'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiRequest, setCsrfToken } from './api'

export interface LocalUser {
  id: string
  username: string
  name: string
  role: 'admin' | 'trainer'
  instructorId?: string
  active?: boolean
}
interface SetupInput { username: string; name: string; password: string; setupToken: string }
interface AuthResult { user: LocalUser | null; needsSetup?: boolean; setupRequired?: boolean; csrfToken?: string; bootstrapToken?: string }
interface AuthContextValue {
  user: LocalUser | null
  loading: boolean
  error: string | null
  needsSetup: boolean
  bootstrapToken: string
  refresh: () => Promise<void>
  setup: (input: SetupInput) => Promise<{ error: string | null }>
  signIn: (username: string, password: string, remember: boolean) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>
}
const AuthContext = createContext<AuthContextValue | null>(null)
function message(error: unknown) { return error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [bootstrapToken, setBootstrapToken] = useState('')
  const acceptSession = useCallback((result: AuthResult) => {
    setCsrfToken(result.csrfToken ?? null)
    setUser(result.user)
    setNeedsSetup(Boolean(result.needsSetup ?? result.setupRequired))
    setBootstrapToken(result.bootstrapToken ?? '')
    setError(null)
  }, [])
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { acceptSession(await apiRequest<AuthResult>('/api/auth/status')) }
    catch (err) { setUser(null); setError(message(err)) }
    finally { setLoading(false) }
  }, [acceptSession])
  useEffect(() => {
    localStorage.removeItem('pkv-auth-session')
    localStorage.removeItem('pkv-auth-password-hash')
    sessionStorage.removeItem('pkv-auth-session')
    void refresh()
    const onExpired = () => { setUser(null); setCsrfToken(null); setError('Sua sessão expirou. Entre novamente para continuar.') }
    window.addEventListener('pkv-session-expired', onExpired)
    return () => window.removeEventListener('pkv-session-expired', onExpired)
  }, [refresh])
  const setup = useCallback(async (input: SetupInput) => {
    try { acceptSession(await apiRequest<AuthResult>('/api/auth/setup', { method: 'POST', body: JSON.stringify(input) })); return { error: null } }
    catch (err) { return { error: message(err) } }
  }, [acceptSession])
  const signIn = useCallback(async (username: string, password: string, remember: boolean) => {
    try { acceptSession(await apiRequest<AuthResult>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: username.trim(), password, remember }) })); return { error: null } }
    catch (err) { return { error: message(err) } }
  }, [acceptSession])
  const signOut = useCallback(async () => {
    try { await flushData(); await apiRequest('/api/auth/logout', { method: 'POST' }); setUser(null); setCsrfToken(null); setError(null) }
    catch (err) { window.alert(`Não foi possível sair com segurança. Mantenha a aba aberta para preservar as alterações. ${message(err)}`) }
  }, [])
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (newPassword.length < 10) return { error: 'A nova senha precisa ter pelo menos 10 caracteres.' }
    try {
      const result = await apiRequest<{ csrfToken?: string }>('/api/auth/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) })
      if (result.csrfToken) setCsrfToken(result.csrfToken)
      return { error: null }
    } catch (err) { return { error: message(err) } }
  }, [])
  const value = useMemo<AuthContextValue>(() => ({ user, loading, error, needsSetup, bootstrapToken, refresh, setup, signIn, signOut, changePassword }), [user, loading, error, needsSetup, bootstrapToken, refresh, setup, signIn, signOut, changePassword])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- provider and hook share their context
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
