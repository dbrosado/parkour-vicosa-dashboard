import { Eye, EyeOff, Loader2, Lock, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { useAuth } from '../lib/auth'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'

export function LoginPage() {
  const { signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: err } = await signIn(username, password, remember)
    if (err) setError(err)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 animate-mount">
        {/* Logo / Header */}
        <div className="text-center">
          <img
            src="/parkour-vicosa-logo.jpg"
            alt="Logo Parkour Viçosa"
            className="mx-auto mb-4 h-20 w-20 rounded-2xl border border-border/40 object-cover shadow-soft"
          />
          <h1 className="font-display text-2xl font-bold text-white">Parkour Viçosa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Painel local de gestão da academia
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-primary/10 shadow-soft">
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="mb-1 block text-xs text-muted-foreground">Usuário</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Seu usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    autoComplete="username"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-xs text-muted-foreground">Senha</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-white"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
                Manter conectado neste dispositivo
              </label>

              {error && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-400">
                  {error}
                </div>
              )}

              <Button type="submit" className="btn-glow w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground/50">
          Dados armazenados apenas neste computador · Parkour Viçosa v2.0
        </p>
      </div>
    </div>
  )
}
