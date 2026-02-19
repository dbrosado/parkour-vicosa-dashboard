import {
  Bell,
  Loader2,
  LogOut,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '../lib/auth'
import { getEmailDomain, securityDebugLog } from '../lib/security-debug'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../lib/auth'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'

interface ManagedUser {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
}

export function SettingsView() {
  const { isAdmin, signOut, profile } = useAuth()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('instructor')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const loadUsers = useCallback(async () => {
    if (!supabase || !isAdmin) return
    setLoadingUsers(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      securityDebugLog('settings.load_users_failed', {
        code: error.code,
        message: error.message,
      })
    }

    securityDebugLog('settings.load_users_result', {
      isAdmin,
      count: data?.length ?? 0,
    })

    if (data) setUsers(data as ManagedUser[])
    setLoadingUsers(false)
  }, [isAdmin])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleAddUser = async () => {
    if (!supabase || !newEmail || !newPassword) return
    setAdding(true)
    setAddError(null)

    securityDebugLog('settings.add_user_attempt', {
      byAdminId: profile?.id ?? null,
      emailDomain: getEmailDomain(newEmail),
      role: newRole,
    })

    const { error } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
      options: {
        data: { name: newName, role: newRole },
      },
    })

    if (error) {
      securityDebugLog('settings.add_user_failed', {
        byAdminId: profile?.id ?? null,
        emailDomain: getEmailDomain(newEmail),
        role: newRole,
        code: error.code,
        message: error.message,
      })
      setAddError(error.message)
    } else {
      securityDebugLog('settings.add_user_success', {
        byAdminId: profile?.id ?? null,
        emailDomain: getEmailDomain(newEmail),
        role: newRole,
      })
      setShowAddForm(false)
      setNewEmail('')
      setNewName('')
      setNewPassword('')
      setNewRole('instructor')
      // Wait for trigger to create profile, then reload
      setTimeout(() => loadUsers(), 1000)
    }
    setAdding(false)
  }

  const handleDeleteUser = async (userId: string) => {
    if (!supabase || userId === profile?.id) return
    // Only delete the profile - the auth user remains but can't access
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (error) {
      securityDebugLog('settings.delete_user_failed', {
        byAdminId: profile?.id ?? null,
        targetUserId: userId,
        code: error.code,
        message: error.message,
      })
      return
    }

    securityDebugLog('settings.delete_user_success', {
      byAdminId: profile?.id ?? null,
      targetUserId: userId,
    })

    setUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/10 bg-hero-grid shadow-soft-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-xl sm:text-2xl">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            Configuracoes
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Ajustes rapidos para notificacoes, seguranca e operacao diaria.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* User Management - Admin Only */}
      {isAdmin && supabase && (
        <Card className="shadow-soft-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-display text-white">
              <Users className="h-5 w-5 text-primary" />
              Gerenciar Usuarios
            </CardTitle>
            <CardDescription>
              Adicione professores e gerencie acessos a plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Users List */}
            {loadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2 stagger-children">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/20 bg-surface/40 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {u.name || u.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          u.role === 'admin'
                            ? 'chip-success text-[10px]'
                            : 'rounded-full border border-border/20 bg-surface/40 px-2 py-0.5 text-[10px] text-muted-foreground'
                        }
                      >
                        {u.role === 'admin' ? 'Admin' : 'Professor'}
                      </span>
                      {u.id !== profile?.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                          title="Remover acesso"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add User Form */}
            {showAddForm ? (
              <div className="rounded-xl border border-primary/20 bg-surface/40 p-4 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-display font-semibold text-white/80">
                    Novo Usuario
                  </p>
                  <button type="button" onClick={() => setShowAddForm(false)}>
                    <X className="h-4 w-4 text-muted-foreground hover:text-white" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Nome</label>
                    <Input
                      placeholder="Nome completo"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">E-mail</label>
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="mt-0.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Senha</label>
                    <Input
                      type="password"
                      placeholder="Minimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="mt-0.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Funcao</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="mt-0.5 h-9 w-full rounded-lg border border-border/20 bg-surface/60 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="instructor">Professor</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>
                {addError && (
                  <p className="text-xs text-rose-400">{addError}</p>
                )}
                <Button
                  size="sm"
                  onClick={handleAddUser}
                  className="w-full"
                  disabled={adding || !newEmail || !newPassword}
                >
                  {adding ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-3.5 w-3.5" />
                  )}
                  Criar Usuario
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="w-full gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar Professor
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      <Card className="shadow-soft-sm">
        <CardContent className="space-y-3 p-4 sm:p-5 stagger-children">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border/20 bg-surface/40 px-4 py-3 transition-colors hover:border-border/30 hover:bg-surface/60 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Notificar turma lotada</p>
              <p className="text-xs text-muted-foreground">Alerta quando uma turma atingir 12 alunos.</p>
            </div>
            <Checkbox defaultChecked />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-border/20 bg-surface/40 px-4 py-3 transition-colors hover:border-border/30 hover:bg-surface/60 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Lembrete de inadimplencia</p>
              <p className="text-xs text-muted-foreground">Enviar aviso automatico para responsaveis.</p>
            </div>
            <Checkbox defaultChecked />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-border/20 bg-surface/40 px-4 py-3 transition-colors hover:border-border/30 hover:bg-surface/60 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Aprovacao dupla para exclusoes</p>
              <p className="text-xs text-muted-foreground">Protecao extra para mudancas criticas de dados.</p>
            </div>
            <Checkbox />
          </label>

          <div className="grid gap-3 rounded-xl border border-border/20 bg-surface/40 p-4 text-sm text-muted-foreground sm:grid-cols-2">
            <p className="inline-flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Canal de avisos: WhatsApp + E-mail
            </p>
            <p className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Backup diario as 23:30
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      {supabase && (
        <Card className="shadow-soft-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">
                  Conectado como {profile?.name || profile?.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {profile?.role === 'admin' ? 'Administrador' : 'Professor'}
                </p>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
