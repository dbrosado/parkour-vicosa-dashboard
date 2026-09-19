import { AlertTriangle, Check, Database, Download, KeyRound, Loader2, LogOut, RefreshCw, ShieldCheck, SlidersHorizontal, Upload, UserCircle2, UserPlus, Users } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { apiRequest } from '../lib/api'
import { useAuth, type LocalUser } from '../lib/auth'
import { flushData } from '../lib/data-sync'
import { useStore } from '../store/useStore'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'

type Notice = { ok: boolean; text: string } | null
type Backup = { app: string; version: number; revision: number; data: Record<string, unknown> }
const selectClass = 'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm'
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível concluir a operação.'
function NoticeText({ notice }: { notice: Notice }) {
  return notice ? <p role={notice.ok ? 'status' : 'alert'} className={`flex items-start gap-1.5 text-sm ${notice.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{notice.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}{notice.text}</p> : null
}
function downloadJson(json: string, prefix: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function UserAccess() {
  const { user } = useAuth()
  const instructors = useStore((state) => state.instructors)
  const [users, setUsers] = useState<LocalUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [instructorId, setInstructorId] = useState('')
  const [resetId, setResetId] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editingInstructor, setEditingInstructor] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { const result = await apiRequest<{ users: LocalUser[] }>('/api/users'); setUsers(result.users) }
    catch (error) { setNotice({ ok: false, text: errorText(error) }) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const create = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setNotice(null)
    try {
      await apiRequest('/api/users', { method: 'POST', body: JSON.stringify({ name, username, password, instructorId, role: 'trainer' }) })
      setName(''); setUsername(''); setPassword(''); setInstructorId('')
      await load()
      setNotice({ ok: true, text: 'Acesso criado. Entregue o usuário e a senha ao treinador por um canal privado. Ele poderá alterar a senha na própria conta.' })
    } catch (error) { setNotice({ ok: false, text: errorText(error) }) }
    finally { setBusy(false) }
  }
  const update = async (id: string, changes: Record<string, unknown>, success: string) => {
    setBusy(true)
    setNotice(null)
    try {
      await apiRequest(`/api/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(changes) })
      await load()
      setNotice({ ok: true, text: success })
      setResetId(''); setResetPassword(''); setEditingId('')
    } catch (error) { setNotice({ ok: false, text: errorText(error) }) }
    finally { setBusy(false) }
  }

  return <Card className="shadow-soft-sm">
    <CardHeader><CardTitle className="flex items-center gap-2 font-display text-lg"><Users className="h-5 w-5 text-primary" />Acesso dos treinadores</CardTitle><CardDescription>Cada treinador recebe sua própria conta e pode acompanhar turmas, presenças e evolução dos alunos da academia. CRM, financeiro, backup e gestão de acessos são exclusivos do administrador.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <NoticeText notice={notice} />
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Contas cadastradas</p><Button size="sm" variant="outline" onClick={() => void load()} disabled={loading || busy} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Atualizar</Button></div>
      {loading ? <p role="status" className="text-sm text-muted-foreground">Carregando contas...</p> : <div className="space-y-2">{users.map((account) => <div key={account.id} className="rounded-xl border border-border/30 bg-surface/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{account.name} <span className="text-xs text-muted-foreground">({account.username})</span></p><p className="text-xs text-muted-foreground">{account.role === 'admin' ? 'Administrador' : `Treinador · ${instructors.find((item) => item.id === account.instructorId)?.name ?? 'Sem vínculo de professor'}`} · {account.active === false ? 'Acesso revogado' : 'Ativo'}</p></div>{account.id !== user?.id && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => { setResetId(account.id); setResetPassword('') }}>Redefinir senha</Button>{account.role === 'trainer' && <><Button size="sm" variant="outline" disabled={busy} onClick={() => { setEditingId(account.id); setEditingInstructor(account.instructorId ?? '') }}>Vínculo</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => { if (account.active === false || window.confirm(`Revogar o acesso de ${account.name}? As sessões serão encerradas.`)) void update(account.id, { active: account.active === false }, account.active === false ? 'Acesso reativado.' : 'Acesso revogado e sessões encerradas.') }}>{account.active === false ? 'Reativar' : 'Revogar acesso'}</Button></>}</div>}</div>
        {editingId === account.id && <form onSubmit={(event) => { event.preventDefault(); void update(account.id, { instructorId: editingInstructor }, 'Vínculo de treinador atualizado.') }} className="mt-3 flex flex-wrap items-end gap-2"><label className="flex-1 text-xs text-muted-foreground">Cadastro de professor<select className={`${selectClass} mt-1`} value={editingInstructor} onChange={(event) => setEditingInstructor(event.target.value)} required><option value="">Selecione</option>{instructors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Button type="submit" size="sm" disabled={busy}>Salvar vínculo</Button><Button type="button" variant="outline" size="sm" onClick={() => setEditingId('')}>Cancelar</Button></form>}
        {resetId === account.id && <form onSubmit={(event) => { event.preventDefault(); void update(account.id, { password: resetPassword }, 'Senha redefinida. As sessões anteriores foram encerradas. Entregue a nova senha por um canal privado.') }} className="mt-3 flex flex-wrap items-end gap-2"><label className="flex-1 text-xs text-muted-foreground">Nova senha para {account.username}<Input className="mt-1" type="password" autoComplete="new-password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} required minLength={10} placeholder="Mínimo 10 caracteres" /></label><Button type="submit" size="sm" disabled={busy}>Salvar senha</Button><Button type="button" variant="outline" size="sm" onClick={() => { setResetId(''); setResetPassword('') }}>Cancelar</Button></form>}
      </div>)}</div>}
      <form onSubmit={create} className="space-y-3 rounded-xl border border-border/30 p-4">
        <p className="flex items-center gap-2 text-sm font-medium"><UserPlus className="h-4 w-4 text-primary" />Criar acesso de treinador</p>
        {!instructors.length && <p className="text-sm text-amber-300">Cadastre primeiro o professor na seção Professores e defina sua escala de turmas.</p>}
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Nome<Input className="mt-1" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} autoComplete="off" /></label><label className="text-xs text-muted-foreground">Usuário de acesso<Input className="mt-1" value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={50} autoComplete="off" autoCapitalize="none" /></label><label className="text-xs text-muted-foreground">Senha inicial<Input className="mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={10} autoComplete="new-password" placeholder="Mínimo 10 caracteres" /></label><label className="text-xs text-muted-foreground">Vincular ao professor<select className={`${selectClass} mt-1`} value={instructorId} onChange={(event) => setInstructorId(event.target.value)} required><option value="">Selecione o professor</option>{instructors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
        <p className="text-xs text-muted-foreground">O treinador entra pelo mesmo endereço do painel com seu usuário e senha. O computador da academia precisa estar ligado e acessível.</p>
        <Button type="submit" size="sm" disabled={busy || !instructors.length} className="gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}Criar acesso</Button>
      </form>
    </CardContent>
  </Card>
}

export function SettingsView({ canBackup = true }: { canBackup?: boolean }) {
  const { user, signOut, changePassword } = useAuth()
  const { students, crmLeads } = useStore()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<Notice>(null)
  const [changing, setChanging] = useState(false)
  const [backupMsg, setBackupMsg] = useState<Notice>(null)
  const [backupBusy, setBackupBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const legacyBackup = localStorage.getItem('parkour-vicosa-storage')

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordMsg(null)
    if (newPassword !== confirmPassword) { setPasswordMsg({ ok: false, text: 'A confirmação não confere com a nova senha.' }); return }
    setChanging(true)
    const { error } = await changePassword(currentPassword, newPassword)
    setChanging(false)
    if (error) { setPasswordMsg({ ok: false, text: error }); return }
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    setPasswordMsg({ ok: true, text: 'Senha alterada com sucesso.' })
  }
  const handleExport = async () => {
    setBackupBusy(true); setBackupMsg(null)
    try {
      await flushData()
      const backup = await apiRequest<Backup>('/api/backup')
      downloadJson(JSON.stringify(backup, null, 2), 'backup-parkour-vicosa')
      setBackupMsg({ ok: true, text: 'Backup dos dados do servidor exportado. Guarde o arquivo em um local seguro.' })
    } catch (error) { setBackupMsg({ ok: false, text: errorText(error) }) }
    finally { setBackupBusy(false) }
  }
  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setBackupMsg({ ok: false, text: 'O arquivo ultrapassa o limite de 10 MB.' }); return }
    setBackupBusy(true); setBackupMsg(null)
    try {
      const backup = JSON.parse(await file.text()) as Partial<Backup>
      if (backup?.app !== 'parkour-vicosa' || !backup.data || !Array.isArray(backup.data.students)) throw new Error('Este arquivo não é um backup válido do Parkour Viçosa.')
      if (!window.confirm(`Restaurar "${file.name}" no servidor? Isso substituirá os dados da academia para todos os usuários. O servidor guardará uma cópia do estado anterior. Contas de acesso e conexão WhatsApp não estão incluídas neste arquivo.`)) return
      await flushData()
      const current = await apiRequest<Backup>('/api/backup')
      await apiRequest('/api/backup', { method: 'POST', body: JSON.stringify({ ...backup, revision: current.revision }) })
      window.location.reload()
    } catch (error) { setBackupMsg({ ok: false, text: error instanceof SyntaxError ? 'O arquivo não contém JSON válido.' : errorText(error) }) }
    finally { setBackupBusy(false) }
  }
  const downloadLegacy = () => {
    try {
      const legacy = JSON.parse(legacyBackup ?? '{}') as { state?: Record<string, unknown> }
      if (!legacy.state || !Array.isArray(legacy.state.students)) throw new Error('Os dados antigos deste navegador não estão em um formato reconhecido.')
      downloadJson(JSON.stringify({ app: 'parkour-vicosa', version: 3, data: Object.fromEntries(Object.keys((JSON.parse(useStore.getState().exportBackup()) as Backup).data).filter(key => key in legacy.state!).map(key => [key, legacy.state![key]])) }, null, 2), 'backup-antigo-navegador')
      setBackupMsg({ ok: true, text: 'Cópia antiga exportada. Revise os cadastros antes de restaurar, pois ela pode conter dados de demonstração.' })
    } catch (error) { setBackupMsg({ ok: false, text: errorText(error) }) }
  }

  return <div className="space-y-4">
    <Card className="border-primary/10 bg-hero-grid shadow-soft-sm"><CardHeader><CardTitle className="flex items-center gap-2 font-display text-xl sm:text-2xl"><SlidersHorizontal className="h-5 w-5 text-primary" />{user?.role === 'admin' ? 'Configurações' : 'Minha conta'}</CardTitle><CardDescription>Conta individual{user?.role === 'admin' ? ', acessos da equipe e backup dos dados do servidor.' : ' e senha de acesso.'}</CardDescription></CardHeader></Card>
    <Card className="shadow-soft-sm"><CardHeader><CardTitle className="flex items-center gap-2 font-display text-lg"><UserCircle2 className="h-5 w-5 text-primary" />Minha conta</CardTitle><CardDescription>Acesso validado pelo servidor da academia.</CardDescription></CardHeader><CardContent className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/20 bg-surface/40 px-4 py-3"><div><p className="text-sm font-medium">{user?.name}</p><p className="text-xs text-muted-foreground">{user?.username} · {user?.role === 'admin' ? 'Administrador' : 'Treinador'}</p></div><Button variant="outline" size="sm" onClick={() => void signOut()} className="gap-1.5"><LogOut className="h-3.5 w-3.5" />Sair</Button></div>
      <form onSubmit={handleChangePassword} className="space-y-3 rounded-xl border border-border/20 bg-surface/40 p-4"><p className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="h-4 w-4 text-primary" />Alterar senha</p><div className="grid gap-3 sm:grid-cols-3"><label className="text-xs text-muted-foreground">Senha atual<Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1" autoComplete="current-password" required /></label><label className="text-xs text-muted-foreground">Nova senha<Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1" placeholder="Mínimo 10 caracteres" autoComplete="new-password" required minLength={10} /></label><label className="text-xs text-muted-foreground">Confirmar nova senha<Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1" autoComplete="new-password" required minLength={10} /></label></div><NoticeText notice={passwordMsg} /><Button type="submit" size="sm" disabled={changing} className="gap-1.5">{changing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}Salvar nova senha</Button></form>
    </CardContent></Card>
    {user?.role === 'admin' && <><UserAccess /><Card className="shadow-soft-sm"><CardHeader><CardTitle className="flex items-center gap-2 font-display text-lg"><Database className="h-5 w-5 text-primary" />Backup dos dados</CardTitle><CardDescription>Exporte os cadastros, CRM, presenças e financeiro salvos no servidor. Contas, senhas e sessão WhatsApp ficam fora deste arquivo. Para recuperação completa, preserve também a pasta de dados do servidor.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap justify-between gap-3 rounded-xl border border-border/20 bg-surface/40 p-4 text-sm text-muted-foreground"><p>{students.length} alunos · {crmLeads.length} leads</p><p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" />Acesso exclusivo do administrador</p></div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => void handleExport()} disabled={backupBusy || !canBackup} className="gap-2"><Download className="h-4 w-4" />Exportar backup do servidor</Button><Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={backupBusy || !canBackup} className="gap-2"><Upload className="h-4 w-4" />Restaurar backup</Button>{legacyBackup && <Button size="sm" variant="outline" onClick={downloadLegacy} disabled={backupBusy} className="gap-2"><Download className="h-4 w-4" />Baixar dados antigos deste navegador</Button>}<input ref={fileInputRef} type="file" accept="application/json,.json" onChange={(event) => void handleImportFile(event)} className="hidden" aria-label="Arquivo de backup" /></div>{!canBackup && <p className="text-xs text-amber-300">Aguarde a confirmação de salvamento antes de exportar ou restaurar.</p>}{backupBusy && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Processando backup...</p>}<NoticeText notice={backupMsg} /></CardContent></Card></>}
  </div>
}
