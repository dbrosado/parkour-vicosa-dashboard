import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export interface LocalUser {
  username: string
  name: string
}

interface AuthContextValue {
  user: LocalUser | null
  signIn: (username: string, password: string, remember: boolean) => Promise<{ error: string | null }>
  signOut: () => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>
}

const DEFAULT_USERNAME = 'danilo'
// SHA-256 de "parkour2026" — senha padrão, alterável em Configurações
const DEFAULT_PASSWORD_HASH = 'b8effb81d5a54efd99002c7555a909dd8ff38c769f6e544be4ba7110c6ac1e5b'

const SESSION_KEY = 'pkv-auth-session'
const PASSWORD_KEY = 'pkv-auth-password-hash'

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function storedPasswordHash(): string {
  return localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD_HASH
}

function readSession(): LocalUser | null {
  const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as LocalUser
  } catch {
    return null
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // localStorage é síncrono, então a sessão já entra resolvida no primeiro render
  const [user, setUser] = useState<LocalUser | null>(readSession)

  const signIn = useCallback(async (username: string, password: string, remember: boolean) => {
    const normalized = username.trim().toLowerCase()
    const passwordHash = await sha256Hex(password)

    if (normalized !== DEFAULT_USERNAME || passwordHash !== storedPasswordHash()) {
      return { error: 'Usuário ou senha incorretos.' }
    }

    const nextUser: LocalUser = { username: DEFAULT_USERNAME, name: 'Danilo' }
    const storage = remember ? localStorage : sessionStorage
    storage.setItem(SESSION_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
    return { error: null }
  }, [])

  const signOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const currentHash = await sha256Hex(currentPassword)
    if (currentHash !== storedPasswordHash()) {
      return { error: 'Senha atual incorreta.' }
    }
    if (newPassword.length < 6) {
      return { error: 'A nova senha precisa ter pelo menos 6 caracteres.' }
    }
    localStorage.setItem(PASSWORD_KEY, await sha256Hex(newPassword))
    return { error: null }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, signIn, signOut, changePassword }),
    [user, signIn, signOut, changePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook e provider compartilham o contexto
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
