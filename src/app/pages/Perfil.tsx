import { useEffect, useMemo, useState } from 'react'
import { User, Bell, Lock, SlidersHorizontal, History, Shield, HelpCircle, AlertTriangle } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Switch } from '../components/ui/switch'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { toast } from 'sonner'
import { resetApplication } from '../utils/helpers'

type ProfilePreferences = {
  theme: 'system' | 'light' | 'dark'
  language: 'pt-BR' | 'en-US'
  compactMode: boolean
  analyticsOptIn: boolean
}

type ProfileNotificationSettings = {
  email: boolean
  inApp: boolean
  marketing: boolean
}

type ProfilePrivacySettings = {
  showEmail: boolean
  showActivity: boolean
}

type ProfileActivityEvent = {
  id: string
  type: string
  createdAt: string
  metadata?: Record<string, string | number | boolean | null>
}

type ProfileNotification = {
  id: string
  title: string
  body: string
  createdAt: string
  readAt: string | null
}

type SupportTicket = {
  id: string
  subject: string
  message: string
  createdAt: string
  status: 'open' | 'closed'
}

type PublicUser = {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string
  phone?: string
  department?: string
  mustChangePassword?: boolean
  preferences: ProfilePreferences
  notificationSettings: ProfileNotificationSettings
  privacy: ProfilePrivacySettings
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'same-origin',
  })

  const contentType = res.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await res.json() : null
  if (!res.ok) {
    const message = data?.error || `Erro HTTP ${res.status}`
    const err: any = new Error(message)
    err.status = res.status
    throw err
  }
  return data as T
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR')
}

function activityLabel(type: string) {
  switch (type) {
    case 'profile.updated':
      return 'Perfil atualizado'
    case 'password.changed':
      return 'Senha alterada'
    case 'preferences.updated':
      return 'Preferências atualizadas'
    case 'notifications.updated':
      return 'Notificações atualizadas'
    case 'privacy.updated':
      return 'Privacidade atualizada'
    case 'support.ticket.created':
      return 'Chamado criado'
    case 'notification.read':
      return 'Notificação marcada como lida'
    default:
      return type
  }
}

export function Perfil() {
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get('tab') || 'profile') as
    | 'profile'
    | 'password'
    | 'preferences'
    | 'notifications'
    | 'activity'
    | 'privacy'
    | 'support'

  const setTab = (next: string) => {
    const nextSp = new URLSearchParams(sp)
    nextSp.set('tab', next)
    setSp(nextSp, { replace: true })
  }

  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  const [bootstrapping, setBootstrapping] = useState(true)
  const [user, setUser] = useState<PublicUser | null>(null)

  const mustChangePassword = Boolean(user?.mustChangePassword)

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [savingNotificationsSettings, setSavingNotificationsSettings] = useState(false)
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [savingTicket, setSavingTicket] = useState(false)

  const [notifications, setNotifications] = useState<ProfileNotification[] | null>(null)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [activity, setActivity] = useState<ProfileActivityEvent[] | null>(null)
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null)

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    avatarUrl: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  })

  const [preferencesForm, setPreferencesForm] = useState<ProfilePreferences>({
    theme: 'system',
    language: 'pt-BR',
    compactMode: false,
    analyticsOptIn: false,
  })

  const [notificationsSettingsForm, setNotificationsSettingsForm] = useState<ProfileNotificationSettings>({
    email: true,
    inApp: true,
    marketing: false,
  })

  const [privacyForm, setPrivacyForm] = useState<ProfilePrivacySettings>({
    showEmail: false,
    showActivity: true,
  })

  const [ticketForm, setTicketForm] = useState({
    subject: '',
    message: '',
  })

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      setBootstrapping(true)
      try {
        let data: { user: PublicUser } | null = null
        try {
          data = await apiJson<{ user: PublicUser }>('/api/profile/me', { method: 'GET' })
        } catch (e: any) {
          const status = typeof e?.status === 'number' ? e.status : null
          if (status === 401) {
            data = null
          } else {
            throw e
          }
        }
        if (cancelled) return
        if (!data) {
          setUser(null)
          return
        }
        setUser(data.user)
        setProfileForm({
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone || '',
          department: data.user.department || '',
          avatarUrl: data.user.avatarUrl,
        })
        setPreferencesForm(data.user.preferences)
        setNotificationsSettingsForm(data.user.notificationSettings)
        setPrivacyForm(data.user.privacy)
        const ntf = await apiJson<{ unreadCount: number; items: ProfileNotification[] }>(
          '/api/profile/notifications',
          { method: 'GET' },
        )
        if (cancelled) return
        setNotifications(ntf.items)
        setUnreadCount(ntf.unreadCount)
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || 'Falha ao carregar perfil')
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }
    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function loadTabData() {
      try {
        if (tab === 'activity' && activity === null) {
          const data = await apiJson<{ activity: ProfileActivityEvent[] }>('/api/profile/activity?limit=50')
          if (!cancelled) setActivity(data.activity)
        }
        if (tab === 'support' && tickets === null) {
          const data = await apiJson<{ tickets: SupportTicket[] }>('/api/profile/support/tickets')
          if (!cancelled) setTickets(data.tickets)
        }
        if (tab === 'notifications' && notifications === null) {
          const ntf = await apiJson<{ unreadCount: number; items: ProfileNotification[] }>('/api/profile/notifications')
          if (!cancelled) {
            setNotifications(ntf.items)
            setUnreadCount(ntf.unreadCount)
          }
        }
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || 'Falha ao carregar dados')
      }
    }

    loadTabData()
    return () => {
      cancelled = true
    }
  }, [tab, user, activity, tickets, notifications])

  useEffect(() => {
    if (!mustChangePassword) return
    if (tab === 'password') return
    const nextSp = new URLSearchParams(sp)
    nextSp.set('tab', 'password')
    setSp(nextSp, { replace: true })
  }, [mustChangePassword, setSp, sp, tab])

  const effectiveEmail = useMemo(() => {
    if (!user) return ''
    if (privacyForm.showEmail) return profileForm.email
    return '••••••••@•••••••.•••'
  }, [privacyForm.showEmail, profileForm.email, user])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const data = await apiJson<{ user: PublicUser }>('/api/profile/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: profileForm.name,
          email: profileForm.email,
          phone: profileForm.phone || undefined,
          department: profileForm.department || undefined,
          avatarUrl: profileForm.avatarUrl || undefined,
        }),
      })
      setUser(data.user)
      toast.success('Perfil atualizado')
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível atualizar o perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast.error('As senhas não conferem')
      return
    }
    setSavingPassword(true)
    try {
      await apiJson<{ ok: true }>('/api/profile/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword.trim() ? passwordForm.currentPassword : undefined,
          newPassword: passwordForm.newPassword,
        }),
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      setUser(u => (u ? { ...u, mustChangePassword: false } : u))
      toast.success('Senha alterada')
      setActivity(null)
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível alterar a senha')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSavePreferences = async () => {
    setSavingPreferences(true)
    try {
      const data = await apiJson<{ preferences: ProfilePreferences }>('/api/profile/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferencesForm),
      })
      setPreferencesForm(data.preferences)
      toast.success('Preferências salvas')
      setActivity(null)
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar preferências')
    } finally {
      setSavingPreferences(false)
    }
  }

  const handleSaveNotificationSettings = async () => {
    setSavingNotificationsSettings(true)
    try {
      const data = await apiJson<{ settings: ProfileNotificationSettings }>('/api/profile/notifications/settings', {
        method: 'PUT',
        body: JSON.stringify(notificationsSettingsForm),
      })
      setNotificationsSettingsForm(data.settings)
      toast.success('Notificações atualizadas')
      setActivity(null)
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível atualizar notificações')
    } finally {
      setSavingNotificationsSettings(false)
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      const data = await apiJson<{ unreadCount: number }>('/api/profile/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ id }),
      })
      setUnreadCount(data.unreadCount)
      setNotifications(prev => (prev ? prev.map(n => (n.id === id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n)) : prev))
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível marcar como lida')
    }
  }

  const handleSavePrivacy = async () => {
    setSavingPrivacy(true)
    try {
      const data = await apiJson<{ privacy: ProfilePrivacySettings }>('/api/profile/privacy', {
        method: 'PUT',
        body: JSON.stringify(privacyForm),
      })
      setPrivacyForm(data.privacy)
      toast.success('Privacidade atualizada')
      setActivity(null)
      if (!data.privacy.showActivity) setActivity([])
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível atualizar privacidade')
    } finally {
      setSavingPrivacy(false)
    }
  }

  const handleCreateTicket = async () => {
    setSavingTicket(true)
    try {
      const data = await apiJson<{ ticket: SupportTicket }>('/api/profile/support/tickets', {
        method: 'POST',
        body: JSON.stringify(ticketForm),
      })
      setTickets(prev => (prev ? [data.ticket, ...prev] : [data.ticket]))
      setTicketForm({ subject: '', message: '' })
      toast.success('Chamado enviado')
      setActivity(null)
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível enviar chamado')
    } finally {
      setSavingTicket(false)
    }
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1
              className="text-gray-900 tracking-tight"
              style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}
            >
              Perfil do Usuário
            </h1>
            <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Gerencie suas informações, preferências e segurança.
            </p>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <img
              src={profileForm.avatarUrl || user.avatarUrl}
              alt={user.name}
              className="w-10 h-10 rounded-full border border-gray-200 bg-white"
            />
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900 leading-tight">{user.name}</div>
              <div className="text-xs text-gray-500 leading-tight">{user.role}</div>
            </div>
          </div>
        )}
      </div>

      {!bootstrapping && !user && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">Você não está autenticado</div>
            <div className="text-xs text-gray-500 mt-1">Entre para acessar e gerenciar seu perfil.</div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="black"
              onClick={() => {
                window.location.href = '/api/auth/google/start?next=/perfil'
              }}
            >
              Entrar com Google
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <Tabs
          value={tab}
          onValueChange={next => {
            if (mustChangePassword && next !== 'password') return
            setTab(next)
          }}
        >
          {mustChangePassword && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold leading-tight">Troca de senha obrigatória</div>
                <div className="text-amber-800 leading-tight mt-0.5">
                  Para continuar usando o sistema, defina uma nova senha agora.
                </div>
              </div>
            </div>
          )}
          <TabsList className="w-full justify-start">
            <TabsTrigger value="profile" className="gap-2" disabled={mustChangePassword}>
              <User className="w-4 h-4" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-2">
              <Lock className="w-4 h-4" />
              Senha
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2" disabled={mustChangePassword}>
              <SlidersHorizontal className="w-4 h-4" />
              Preferências
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2" disabled={mustChangePassword}>
              <Bell className="w-4 h-4" />
              Notificações{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2" disabled={mustChangePassword}>
              <History className="w-4 h-4" />
              Atividades
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2" disabled={mustChangePassword}>
              <Shield className="w-4 h-4" />
              Privacidade
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2" disabled={mustChangePassword}>
              <HelpCircle className="w-4 h-4" />
              Suporte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-gray-700">Nome</div>
                <Input
                  value={profileForm.name}
                  onChange={e => setProfileForm(s => ({ ...s, name: e.target.value }))}
                  placeholder="Seu nome"
                  disabled={bootstrapping || !user}
                />
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-gray-700">E-mail</div>
                <Input
                  value={profileForm.email}
                  onChange={e => setProfileForm(s => ({ ...s, email: e.target.value }))}
                  placeholder="seu@email.com"
                  disabled={bootstrapping || !user}
                />
                {user && (
                  <div className="text-xs text-gray-500">
                    Exibição atual: <span className="font-medium text-gray-700">{effectiveEmail}</span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-gray-700">Telefone</div>
                <Input
                  value={profileForm.phone}
                  onChange={e => setProfileForm(s => ({ ...s, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  disabled={bootstrapping || !user}
                />
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-gray-700">Departamento</div>
                <Input
                  value={profileForm.department}
                  onChange={e => setProfileForm(s => ({ ...s, department: e.target.value }))}
                  placeholder="Departamento"
                  disabled={bootstrapping || !user}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <div className="text-sm font-medium text-gray-700">Avatar (URL)</div>
                <Input
                  value={profileForm.avatarUrl}
                  onChange={e => setProfileForm(s => ({ ...s, avatarUrl: e.target.value }))}
                  placeholder="https://..."
                  disabled={bootstrapping || !user}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveProfile} variant="black" disabled={bootstrapping || !user || savingProfile}>
                {savingProfile ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="password" className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!mustChangePassword && (
                <div className="space-y-1.5">
                  <div className="text-sm font-medium text-gray-700">Senha atual</div>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm(s => ({ ...s, currentPassword: e.target.value }))}
                    disabled={bootstrapping || !user}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-gray-700">Nova senha</div>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(s => ({ ...s, newPassword: e.target.value }))}
                  disabled={bootstrapping || !user}
                />
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-gray-700">Confirmar nova senha</div>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.confirmNewPassword}
                  onChange={e => setPasswordForm(s => ({ ...s, confirmNewPassword: e.target.value }))}
                  disabled={bootstrapping || !user}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleChangePassword}
                disabled={
                  bootstrapping ||
                  !user ||
                  savingPassword ||
                  (!mustChangePassword && !passwordForm.currentPassword) ||
                  !passwordForm.newPassword ||
                  !passwordForm.confirmNewPassword
                }
              >
                {savingPassword ? 'Atualizando...' : 'Alterar senha'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-gray-700">Tema</div>
                <Select
                  value={preferencesForm.theme}
                  onValueChange={(v: ProfilePreferences['theme']) => setPreferencesForm(s => ({ ...s, theme: v }))}
                  disabled={bootstrapping || !user}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">Sistema</SelectItem>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Escuro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-gray-700">Idioma</div>
                <Select
                  value={preferencesForm.language}
                  onValueChange={(v: ProfilePreferences['language']) => setPreferencesForm(s => ({ ...s, language: v }))}
                  disabled={bootstrapping || !user}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div>
                  <div className="text-sm font-medium text-gray-800">Modo compacto</div>
                  <div className="text-xs text-gray-500">Reduz espaçamentos em algumas telas.</div>
                </div>
                <Switch
                  checked={preferencesForm.compactMode}
                  onCheckedChange={checked => setPreferencesForm(s => ({ ...s, compactMode: checked }))}
                  disabled={bootstrapping || !user}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div>
                  <div className="text-sm font-medium text-gray-800">Analytics</div>
                  <div className="text-xs text-gray-500">Permite coleta de dados de uso.</div>
                </div>
                <Switch
                  checked={preferencesForm.analyticsOptIn}
                  onCheckedChange={checked => setPreferencesForm(s => ({ ...s, analyticsOptIn: checked }))}
                  disabled={bootstrapping || !user}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSavePreferences} disabled={bootstrapping || !user || savingPreferences}>
                {savingPreferences ? 'Salvando...' : 'Salvar preferências'}
              </Button>
            </div>

            <div className="mt-8 rounded-xl border border-red-200 bg-red-50/40 p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-9 w-9 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-700" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-red-900">Reset da aplicação</div>
                  <div className="mt-1 text-xs text-red-700 leading-relaxed">
                    Remove todos os dados locais preenchidos no navegador (localStorage, sessionStorage, IndexedDB e caches),
                    reinicializa serviços ativos e retorna o sistema ao estado inicial. Esta ação é irreversível.
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="destructive"
                  onClick={() => setResetOpen(true)}
                  disabled={bootstrapping || resetting}
                >
                  Resetar aplicação
                </Button>
              </div>
            </div>

            <AlertDialog open={resetOpen} onOpenChange={v => { if (!resetting) setResetOpen(v) }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar reset completo</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você está prestes a apagar permanentemente todos os dados locais desta instalação (incluindo formulários salvos,
                    cadastros locais, caches e bancos do navegador). Após confirmar, não será possível desfazer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={resetting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    disabled={resetting}
                    onClick={async () => {
                      setResetting(true)
                      toast.message('Resetando aplicação...')
                      try {
                        await resetApplication({ redirectTo: '/login?reset=1' })
                      } catch (e: any) {
                        setResetting(false)
                        toast.error(e?.message || 'Falha ao resetar aplicação')
                      }
                    }}
                  >
                    {resetting ? 'Resetando...' : 'Confirmar e resetar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          <TabsContent value="notifications" className="pt-6 space-y-6">
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="text-sm font-semibold text-gray-900">Configurações</div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                  <div>
                    <div className="text-sm font-medium text-gray-800">E-mail</div>
                    <div className="text-xs text-gray-500">Receber alertas por e-mail.</div>
                  </div>
                  <Switch
                    checked={notificationsSettingsForm.email}
                    onCheckedChange={checked => setNotificationsSettingsForm(s => ({ ...s, email: checked }))}
                    disabled={bootstrapping || !user}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                  <div>
                    <div className="text-sm font-medium text-gray-800">No sistema</div>
                    <div className="text-xs text-gray-500">Receber notificações no app.</div>
                  </div>
                  <Switch
                    checked={notificationsSettingsForm.inApp}
                    onCheckedChange={checked => setNotificationsSettingsForm(s => ({ ...s, inApp: checked }))}
                    disabled={bootstrapping || !user}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 md:col-span-2">
                  <div>
                    <div className="text-sm font-medium text-gray-800">Marketing</div>
                    <div className="text-xs text-gray-500">Comunicações não essenciais.</div>
                  </div>
                  <Switch
                    checked={notificationsSettingsForm.marketing}
                    onCheckedChange={checked => setNotificationsSettingsForm(s => ({ ...s, marketing: checked }))}
                    disabled={bootstrapping || !user}
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button onClick={handleSaveNotificationSettings} disabled={bootstrapping || !user || savingNotificationsSettings}>
                  {savingNotificationsSettings ? 'Salvando...' : 'Salvar configurações'}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/60 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">Notificações</div>
                <div className="text-xs text-gray-500">{unreadCount} não lidas</div>
              </div>
              <div className="divide-y divide-gray-100">
                {(notifications || []).length === 0 && (
                  <div className="p-6 text-sm text-gray-500">Nenhuma notificação.</div>
                )}
                {(notifications || []).map(n => (
                  <div key={n.id} className="p-5 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-semibold ${n.readAt ? 'text-gray-700' : 'text-gray-900'}`}>
                          {n.title}
                        </div>
                        {!n.readAt && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Nova</span>}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{n.body}</div>
                      <div className="text-xs text-gray-400 mt-2">{formatDateTime(n.createdAt)}</div>
                    </div>
                    {!n.readAt && (
                      <Button variant="outline" size="sm" className="h-8" onClick={() => handleMarkRead(n.id)}>
                        Marcar lida
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="pt-6">
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/60">
                <div className="text-sm font-semibold text-gray-900">Histórico de atividades</div>
              </div>
              <div className="divide-y divide-gray-100">
                {(activity || []).length === 0 && (
                  <div className="p-6 text-sm text-gray-500">
                    {privacyForm.showActivity ? 'Nenhuma atividade registrada.' : 'Histórico oculto pelas configurações de privacidade.'}
                  </div>
                )}
                {(activity || []).map(a => (
                  <div key={a.id} className="p-5 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{activityLabel(a.type)}</div>
                      <div className="text-xs text-gray-400 mt-1">{formatDateTime(a.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="pt-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 p-5">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Exibir e-mail</div>
                  <div className="text-xs text-gray-500">Controla se o e-mail fica visível nas telas do sistema.</div>
                </div>
                <Switch
                  checked={privacyForm.showEmail}
                  onCheckedChange={checked => setPrivacyForm(s => ({ ...s, showEmail: checked }))}
                  disabled={bootstrapping || !user}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 p-5">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Registrar e exibir atividades</div>
                  <div className="text-xs text-gray-500">Ativa o histórico de ações no seu perfil.</div>
                </div>
                <Switch
                  checked={privacyForm.showActivity}
                  onCheckedChange={checked => setPrivacyForm(s => ({ ...s, showActivity: checked }))}
                  disabled={bootstrapping || !user}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSavePrivacy} disabled={bootstrapping || !user || savingPrivacy}>
                {savingPrivacy ? 'Salvando...' : 'Salvar privacidade'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="support" className="pt-6 space-y-6">
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="text-sm font-semibold text-gray-900">Abrir chamado</div>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <div className="text-sm font-medium text-gray-700">Assunto</div>
                  <Input
                    value={ticketForm.subject}
                    onChange={e => setTicketForm(s => ({ ...s, subject: e.target.value }))}
                    disabled={bootstrapping || !user}
                    placeholder="Descreva o assunto"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-sm font-medium text-gray-700">Mensagem</div>
                  <Textarea
                    value={ticketForm.message}
                    onChange={e => setTicketForm(s => ({ ...s, message: e.target.value }))}
                    disabled={bootstrapping || !user}
                    placeholder="Explique o problema ou solicitação"
                    className="min-h-[120px]"
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button
                  onClick={handleCreateTicket}
                  disabled={bootstrapping || !user || savingTicket || !ticketForm.subject || !ticketForm.message}
                >
                  {savingTicket ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/60">
                <div className="text-sm font-semibold text-gray-900">Meus chamados</div>
              </div>
              <div className="divide-y divide-gray-100">
                {(tickets || []).length === 0 && <div className="p-6 text-sm text-gray-500">Nenhum chamado.</div>}
                {(tickets || []).map(t => (
                  <div key={t.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{t.subject}</div>
                        <div className="text-xs text-gray-400 mt-1">{formatDateTime(t.createdAt)}</div>
                      </div>
                      <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 whitespace-nowrap">
                        {t.status === 'open' ? 'Aberto' : 'Fechado'}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">{t.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
