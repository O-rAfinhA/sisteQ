import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Perfil } from './Perfil';

let meRole = 'Admin';

const setSpMock = vi.fn();

vi.mock('react-router', () => ({
  useSearchParams: () => [new URLSearchParams('tab=profile'), setSpMock],
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}));

describe('Perfil (RBAC)', () => {
  beforeEach(() => {
    meRole = 'Admin';
    setSpMock.mockReset();

    const makeRes = (status: number, body: any) =>
      ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
        headers: {
          get: () => 'application/json',
        },
      }) as any;

    vi.stubGlobal('fetch', vi.fn(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : String(input?.url || '');
      const method = String(init?.method || 'GET').toUpperCase();

      if (url.endsWith('/api/profile/me') && method === 'GET') {
        return makeRes(200, {
          user: {
            id: 'u_1',
            name: 'João Silva',
            email: 'joao.silva@empresa.com.br',
            role: meRole,
            organizationName: 'ACME',
            avatarUrl: 'https://example.com/a.png',
            preferences: { theme: 'system', language: 'pt-BR', compactMode: false, analyticsOptIn: false },
            notificationSettings: { email: true, inApp: true, marketing: false },
            privacy: { showEmail: false, showActivity: true },
          },
        });
      }

      if (url.endsWith('/api/profile/notifications') && method === 'GET') {
        return makeRes(200, { unreadCount: 0, items: [] });
      }

      return makeRes(404, { error: 'Not found' });
    }));
  });

  it('mostra Preferências/Notificações/Privacidade para Administrador', async () => {
    meRole = 'Admin';
    render(<Perfil />);

    await screen.findByText('João Silva');
    expect(await screen.findByText('Preferências')).toBeInTheDocument();
    expect(await screen.findByText('Notificações')).toBeInTheDocument();
    expect(await screen.findByText('Privacidade')).toBeInTheDocument();
  });

  it('oculta Preferências/Notificações/Privacidade para usuário comum', async () => {
    meRole = 'User';
    render(<Perfil />);

    await screen.findByText('João Silva');
    await waitFor(() => {
      expect(screen.queryByText('Preferências')).not.toBeInTheDocument();
      expect(screen.queryByText('Notificações')).not.toBeInTheDocument();
      expect(screen.queryByText('Privacidade')).not.toBeInTheDocument();
    });
  });
});

