import { Eye, EyeOff, Loader2, Lock, RefreshCw, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'

export function LoginPage() {
  const { signIn, setup, needsSetup, bootstrapToken, loading: checking, error: connectionError, refresh } = useAuth()
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [setupToken, setSetupToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (needsSetup && password !== confirmation) { setError('A confirmação não confere com a senha.'); return }
    setLoading(true)
    const result = needsSetup
      ? await setup({ username, name, password, setupToken: bootstrapToken || setupToken })
      : await signIn(username, password, remember)
    setError(result.error)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6 animate-mount">
        <div className="text-center">
          <img src="/parkour-vicosa-logo.jpg" alt="Logo Parkour Viçosa" className="mx-auto mb-4 h-20 w-20 rounded-2xl border border-border/40 object-cover shadow-soft" />
          <h1 className="font-display text-2xl font-bold text-white">Parkour Viçosa</h1>
          <p className="mt-1 text-sm text-muted-foreground">{needsSetup ? 'Crie a conta do administrador para começar' : 'CRM e gestão da academia'}</p>
        </div>
        <Card className="border-primary/10 shadow-soft">
          <CardContent className="p-5 sm:p-6">
            {checking ? <p role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Verificando acesso ao servidor...</p> : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {connectionError && <div role="alert" className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-300"><p>{connectionError}</p><Button type="button" variant="outline" size="sm" onClick={() => void refresh()} className="gap-2"><RefreshCw className="h-4 w-4" />Verificar conexão</Button></div>}
                {needsSetup && <><div><label htmlFor="name" className="mb-1 block text-xs text-muted-foreground">Seu nome</label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={100} /></div>{!bootstrapToken && <div><label htmlFor="setupToken" className="mb-1 block text-xs text-muted-foreground">Código de instalação</label><Input id="setupToken" type="password" value={setupToken} onChange={(e) => setSetupToken(e.target.value)} required autoComplete="off" /><p className="mt-1 text-xs text-muted-foreground">Abra o painel no computador da academia para liberar a instalação automaticamente ou use o código do arquivo data/setup-token.</p></div>}</>}
                <div><label htmlFor="username" className="mb-1 block text-xs text-muted-foreground">Usuário</label><div className="relative"><User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="username" type="text" placeholder="Seu usuário" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10" autoComplete="username" required minLength={3} maxLength={50} autoCapitalize="none" /></div></div>
                <div><label htmlFor="password" className="mb-1 block text-xs text-muted-foreground">{needsSetup ? 'Crie sua senha (mínimo 10 caracteres)' : 'Senha'}</label><div className="relative"><Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" autoComplete={needsSetup ? 'new-password' : 'current-password'} required minLength={needsSetup ? 10 : 1} /><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-white" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                {needsSetup ? <div><label htmlFor="confirmation" className="mb-1 block text-xs text-muted-foreground">Confirme sua senha</label><Input id="confirmation" type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" required minLength={10} /></div> : <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"><Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />Manter conectado neste dispositivo pessoal</label>}
                {error && <div role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-400">{error}</div>}
                <Button type="submit" className="btn-glow w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{loading ? 'Aguarde...' : needsSetup ? 'Criar conta e abrir academia' : 'Entrar'}</Button>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">Acesso individual. Os dados são salvos no servidor da academia.</p>
      </div>
    </div>
  )
}
