import { useEffect, useRef, useState } from 'react';
import { User, Settings, Bell, HelpCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { clearTenantSession, uninstallTenantLocalStorageShim } from '../utils/helpers';

interface UserMenuMinimizedProps {
  onOpenChange?: (open: boolean) => void;
  onTriggerPointerDownCapture?: () => void;
  onItemSelect?: () => void;
}

type UserState = {
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  notifications: number;
};

export function UserMenuMinimized({
  onOpenChange,
  onTriggerPointerDownCapture,
  onItemSelect,
}: UserMenuMinimizedProps) {
  const hoverOpenDelayMs = 80;
  const hoverCloseDelayMs = 320;
  const navigate = useNavigate();
  const [user, setUser] = useState<UserState>({
    name: '',
    email: '',
    role: '',
    avatarUrl: null,
    notifications: 0,
  });
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const hoverOpenTimerRef = useRef<number | null>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);
  const didHydrateRef = useRef(false);
  const lastOpenSourceRef = useRef<'hover' | 'pointer' | 'keyboard' | 'touch' | 'programmatic'>(
    'programmatic',
  );

  useEffect(() => {
    let cancelled = false;
    async function hydrateUser() {
      if (didHydrateRef.current) return;
      didHydrateRef.current = true;
      setHydrating(true);
      try {
        const meRes = await fetch('/api/profile/me', { method: 'GET', credentials: 'same-origin' });
        const meData = await meRes.json().catch(() => null);
        if (!meRes.ok) {
          if (meRes.status === 401) return;
          throw new Error(meData?.error || 'Falha ao carregar usuário');
        }
        if (cancelled) return;
        setUser(prev => {
          const next = {
            name: meData?.user?.name ?? prev.name,
            email: meData?.user?.email ?? prev.email,
            role: meData?.user?.role ?? prev.role,
            avatarUrl: meData?.user?.avatarUrl ?? prev.avatarUrl,
            notifications: 0,
          } satisfies UserState;
          return next;
        });

        const ntfRes = await fetch('/api/profile/notifications', { credentials: 'same-origin' });
        const ntfData = await ntfRes.json().catch(() => null);
        if (!ntfRes.ok) {
          if (ntfRes.status === 401) return;
          throw new Error(ntfData?.error || 'Falha ao carregar notificações');
        }
        if (cancelled) return;
        setUser(prev => ({ ...prev, notifications: ntfData.unreadCount ?? 0 }));
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || 'Falha ao carregar usuário');
      } finally {
        if (!cancelled) setHydrating(false);
      }
    }
    if (open) hydrateUser();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (hoverOpenTimerRef.current) window.clearTimeout(hoverOpenTimerRef.current);
      if (hoverCloseTimerRef.current) window.clearTimeout(hoverCloseTimerRef.current);
    };
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const flush = (globalThis as any).__SISTEQ_FLUSH_WRITES__;
      if (typeof flush === 'function') await flush();
    } catch {
    }
    try {
      const r = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(data?.error || 'Falha ao sair');
      toast.success('Logout realizado');
      try {
        window.dispatchEvent(new CustomEvent('sisteq:reset', { detail: { persist: false } }));
      } catch {
      }
      clearTenantSession();
      uninstallTenantLocalStorageShim();
      window.location.href = '/';
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao sair');
    } finally {
      setLoading(false);
    }
  };

  const setOpenAndNotify = (nextOpen: boolean) => {
    if (openRef.current === nextOpen) return;
    openRef.current = nextOpen;
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const clearHoverTimers = () => {
    if (hoverOpenTimerRef.current) window.clearTimeout(hoverOpenTimerRef.current);
    if (hoverCloseTimerRef.current) window.clearTimeout(hoverCloseTimerRef.current);
    hoverOpenTimerRef.current = null;
    hoverCloseTimerRef.current = null;
  };

  const scheduleHoverOpen = () => {
    clearHoverTimers();
    if (openRef.current) return;
    hoverOpenTimerRef.current = window.setTimeout(() => {
      lastOpenSourceRef.current = 'hover';
      setOpenAndNotify(true);
    }, hoverOpenDelayMs);
  };

  const scheduleHoverClose = () => {
    clearHoverTimers();
    hoverCloseTimerRef.current = window.setTimeout(() => {
      if (lastOpenSourceRef.current === 'keyboard') {
        const active = document.activeElement;
        const contentEl = document.querySelector('[data-profile-menu="true"]');
        if (
          active &&
          (triggerRef.current?.contains(active) || (contentEl instanceof HTMLElement && contentEl.contains(active)))
        ) {
          return;
        }
      }
      lastOpenSourceRef.current = 'programmatic';
      setOpenAndNotify(false);
    }, hoverCloseDelayMs);
  };

  const handleMouseEnter = () => {
    scheduleHoverOpen();
  };

  const handleMouseLeave = () => {
    scheduleHoverClose();
  };

  const handleOptionMouseEnter = () => {
    clearHoverTimers();
  };

  const handleOptionMouseLeave = () => {
    scheduleHoverClose();
  };

  const handleMenuAreaMouseEnter = () => {
    clearHoverTimers();
  };

  const handleMenuAreaMouseLeave = () => {
    scheduleHoverClose();
  };

  const handleRadixOpenChange = (nextOpen: boolean) => {
    clearHoverTimers();
    setOpenAndNotify(nextOpen);
  };

  const title = user.name || 'Conta';

  return (
    <DropdownMenu open={open} onOpenChange={handleRadixOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full p-0 transition-colors duration-150"
          title={hydrating ? 'Carregando...' : title}
          aria-label={hydrating ? 'Carregando...' : title}
          ref={triggerRef}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
              lastOpenSourceRef.current = 'keyboard';
            }
          }}
          onPointerDownCapture={(e) => {
            lastOpenSourceRef.current = e.pointerType === 'touch' ? 'touch' : 'pointer';
            onTriggerPointerDownCapture?.();
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          disabled={loading}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={title}
              className="h-9 w-9 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="h-9 w-9 rounded-full ring-1 ring-border bg-muted flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          {/* Badge de Notificações */}
          {user.notifications > 0 && (
            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-destructive text-destructive-foreground">
              <span className="text-[10px] font-semibold tabular-nums leading-none">
                {user.notifications}
              </span>
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="relative w-72 max-w-[calc(100vw-1rem)] before:pointer-events-auto before:absolute before:-top-4 before:left-0 before:right-0 before:h-4 before:content-[''] before:bg-transparent"
        style={{ animationDuration: '250ms' }}
        data-profile-menu="true"
        onMouseEnter={handleMenuAreaMouseEnter}
        onMouseLeave={handleMenuAreaMouseLeave}
      >
        {/* Cabeçalho com informações do usuário */}
        <DropdownMenuLabel className="p-2 font-normal">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={title}
                className="h-12 w-12 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div className="h-12 w-12 rounded-full ring-1 ring-border bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium leading-5 text-foreground">{title}</p>
              {!!user.email && <p className="truncate text-xs leading-4 text-muted-foreground">{user.email}</p>}
              {!!user.role && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {user.role}
                </Badge>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Meu Perfil */}
        <DropdownMenuItem
          onSelect={() => {
            clearHoverTimers();
            onItemSelect?.();
            navigate('/perfil?tab=profile');
          }}
          onMouseEnter={handleOptionMouseEnter}
          onMouseLeave={handleOptionMouseLeave}
        >
          <User />
          <span>Meu Perfil</span>
        </DropdownMenuItem>

        {/* Configurações */}
        <DropdownMenuItem
          onSelect={() => {
            clearHoverTimers();
            onItemSelect?.();
            navigate('/perfil?tab=preferences');
          }}
          onMouseEnter={handleOptionMouseEnter}
          onMouseLeave={handleOptionMouseLeave}
        >
          <Settings />
          <span>Configurações</span>
        </DropdownMenuItem>

        {/* Notificações */}
        <DropdownMenuItem
          onSelect={() => {
            clearHoverTimers();
            onItemSelect?.();
            navigate('/perfil?tab=notifications');
          }}
          onMouseEnter={handleOptionMouseEnter}
          onMouseLeave={handleOptionMouseLeave}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Bell />
              <span>Notificações</span>
            </div>
            {user.notifications > 0 && (
              <Badge variant="destructive" className="ml-2 tabular-nums">
                {user.notifications}
              </Badge>
            )}
          </div>
        </DropdownMenuItem>

        {/* Ajuda e Suporte */}
        <DropdownMenuItem
          onSelect={() => {
            clearHoverTimers();
            onItemSelect?.();
            navigate('/perfil?tab=support');
          }}
          onMouseEnter={handleOptionMouseEnter}
          onMouseLeave={handleOptionMouseLeave}
        >
          <HelpCircle />
          <span>Ajuda e Suporte</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sair */}
        <DropdownMenuItem
          onSelect={() => {
            clearHoverTimers();
            onItemSelect?.();
            handleLogout();
          }}
          variant="destructive"
          onMouseEnter={handleOptionMouseEnter}
          onMouseLeave={handleOptionMouseLeave}
        >
          <LogOut />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
