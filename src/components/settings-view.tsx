import {
  AlertTriangle,
  Bell,
  Check,
  Database,
  Download,
  HardDrive,
  KeyRound,
  Loader2,
  LogOut,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  UserCircle2,
} from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'

import { useAuth } from '../lib/auth'
import { useStore } from '../store/useStore'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'

const PREFS_KEY = 'pkv-preferences'

interface Preferences {
  notifyFullClass: boolean
  notifyOverdue: boolean
  doubleConfirmDelete: boolean
}

function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { notifyFullClass: true, notifyOverdue: true, doubleConfirmDelete: false, ...JSON.parse(raw) }
  } catch {
    // preferências corrompidas: volta ao padrão
  }
  return { notifyFullClass: true, notifyOverdue: true, doubleConfirmDelete: false }
}

export function SettingsView() {
  const { user, signOut, changePassword } = useAuth()
  const { students, crmLeads, exportBackup, importBackup, resetAllData } = useStore()

  const [prefs, setPrefs] = useState<Preferences>(loadPrefs)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [changing, setChanging] = useState(false)
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const togglePref = (key: keyof Preferences) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(PREFS_KEY, JSON.stringify(next))
      return next
    })
  }

  const handleChangePassword = async () => {
    setPasswordMsg(null)
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: 'A confirmação não confere com a nova senha.' })
      return
    }
    setChanging(true)
    const { error } = await changePassword(currentPassword, newPassword)
    setChanging(false)
    if (error) {
      setPasswordMsg({ ok: false, text: error })
      return
    }
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordMsg({ ok: true, text: 'Senha alterada com sucesso.' })
  }

  const handleExport = () => {
    const json = exportBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `backup-parkour-vicosa-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setBackupMsg({ ok: true, text: 'Backup exportado. Guarde o arquivo em local seguro.' })
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const confirmed = window.confirm(
      'Importar este backup vai substituir todos os dados atuais do painel. Deseja continuar?',
    )
    if (!confirmed) return

    const text = await file.text()
    const error = importBackup(text)
    setBackupMsg(error ? { ok: false, text: error } : { ok: true, text: 'Backup importado com sucesso.' })
  }

  const handleReset = () => {
    const confirmed = window.confirm(
      'Isso apaga todos os dados (alunos, leads, presenças, finanças) e restaura os dados iniciais de demonstração. Tem certeza?',
    )
    if (!confirmed) return
    const doubleCheck = window.confirm('Última confirmação: esta ação não pode ser desfeita. Zerar tudo?')
    if (!doubleCheck) return
    resetAllData()
    setBackupMsg({ ok: true, text: 'Dados restaurados para o estado inicial.' })
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/10 bg-hero-grid shadow-soft-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-xl sm:text-2xl">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            Configurações
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Conta local, backup dos dados e preferências de operação. Tudo fica salvo neste computador.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Conta local */}
      <Card className="shadow-soft-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-display text-white">
            <UserCircle2 className="h-5 w-5 text-primary" />
            Conta Local
          </CardTitle>
          <CardDescription>Acesso do painel neste dispositivo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/20 bg-surface/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Conectado como {user?.name}</p>
              <p className="text-xs text-muted-foreground">Usuário: {user?.username}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="gap-1.5 text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Button>
          </div>

          <div className="rounded-xl border border-border/20 bg-surface/40 p-4 space-y-3">
            <p className="inline-flex items-center gap-2 text-xs font-display font-semibold text-white/80">
              <KeyRound className="h-4 w-4 text-primary" />
              Alterar senha
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-[10px] text-muted-foreground">Senha atual</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-0.5"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Nova senha</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-0.5"
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Confirmar nova senha</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-0.5"
                  autoComplete="new-password"
                />
              </div>
            </div>
            {passwordMsg && (
              <p className={`inline-flex items-center gap-1.5 text-xs ${passwordMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                {passwordMsg.ok ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                {passwordMsg.text}
              </p>
            )}
            <Button
              size="sm"
              onClick={handleChangePassword}
              disabled={changing || !currentPassword || !newPassword || !confirmPassword}
              className="gap-1.5"
            >
              {changing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              Salvar nova senha
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup */}
      <Card className="shadow-soft-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-display text-white">
            <Database className="h-5 w-5 text-primary" />
            Backup dos Dados
          </CardTitle>
          <CardDescription>
            Os dados vivem no navegador deste computador. Exporte um arquivo JSON regularmente para não perder nada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 rounded-xl border border-border/20 bg-surface/40 p-4 text-sm text-muted-foreground sm:grid-cols-2">
            <p className="inline-flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary" />
              {students.length} alunos · {crmLeads.length} leads no painel
            </p>
            <p className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Armazenamento 100% local (localStorage)
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="sm" onClick={handleExport} className="flex-1 gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Exportar backup (.json)
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1 gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Importar backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="flex-1 gap-1.5 text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Zerar dados
            </Button>
          </div>

          {backupMsg && (
            <p className={`inline-flex items-center gap-1.5 text-xs ${backupMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
              {backupMsg.ok ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {backupMsg.text}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preferências */}
      <Card className="shadow-soft-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-display text-white">
            <Bell className="h-5 w-5 text-primary" />
            Preferências
          </CardTitle>
          <CardDescription>Ajustes de alertas e proteção da operação diária.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 stagger-children">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border/20 bg-surface/40 px-4 py-3 transition-colors hover:border-border/30 hover:bg-surface/60 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Notificar turma lotada</p>
              <p className="text-xs text-muted-foreground">Alerta quando uma turma atingir 12 alunos.</p>
            </div>
            <Checkbox checked={prefs.notifyFullClass} onCheckedChange={() => togglePref('notifyFullClass')} />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-border/20 bg-surface/40 px-4 py-3 transition-colors hover:border-border/30 hover:bg-surface/60 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Lembrete de inadimplência</p>
              <p className="text-xs text-muted-foreground">Destaca responsáveis com pagamento pendente.</p>
            </div>
            <Checkbox checked={prefs.notifyOverdue} onCheckedChange={() => togglePref('notifyOverdue')} />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-border/20 bg-surface/40 px-4 py-3 transition-colors hover:border-border/30 hover:bg-surface/60 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Aprovação dupla para exclusões</p>
              <p className="text-xs text-muted-foreground">Proteção extra para mudanças críticas de dados.</p>
            </div>
            <Checkbox checked={prefs.doubleConfirmDelete} onCheckedChange={() => togglePref('doubleConfirmDelete')} />
          </label>
        </CardContent>
      </Card>
    </div>
  )
}
