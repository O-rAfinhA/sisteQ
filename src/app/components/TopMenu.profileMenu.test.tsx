import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopMenu } from './TopMenu';

const navigateMock = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({ pathname: '/' }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('../hooks/useFornecedores', () => ({
  useFornecedores: () => ({
    fornecedores: [],
    rofs: [],
    avaliacoes: [],
    recebimentos: [],
    pedidos: [],
    configuracao: {
      periodicidadePadraoCritico: 'Semestral',
      periodicidadePadraoNaoCritico: 'Anual',
      permitirAvaliacaoPersonalizada: true,
      notaMinimaAceitavel: 3,
      tiposFornecedor: [],
      metaAvaliacaoPorTipo: {},
      documentosPorTipo: {},
      criteriosHomologacao: [],
      habilitarPedidoCompras: true,
    },
    addFornecedor: () => {},
    updateFornecedor: () => {},
    deleteFornecedor: () => {},
    addROF: () => {},
    updateROF: () => {},
    deleteROF: () => {},
    addAvaliacao: () => {},
    updateAvaliacao: () => {},
    deleteAvaliacao: () => {},
    addRecebimento: () => {},
    updateRecebimento: () => {},
    deleteRecebimento: () => {},
    addPedido: () => {},
    updatePedido: () => {},
    deletePedido: () => {},
    updateConfiguracao: () => {},
  }),
}));

describe('TopMenu (menu de perfil)', () => {
  let meRole = 'Admin';
  let meLanguage: 'pt-BR' | 'en-US' = 'pt-BR';

  beforeEach(() => {
    navigateMock.mockReset();
    meRole = 'Admin';
    meLanguage = 'pt-BR';
    try {
      window.sessionStorage?.clear?.();
    } catch {
    }

    const makeRes = (status: number, body: any) =>
      ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
      }) as any;

    vi.stubGlobal('fetch', vi.fn(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : String(input?.url || '');
      const method = String(init?.method || 'GET').toUpperCase();

      if (url.endsWith('/api/profile/me') && method === 'GET') {
        return makeRes(200, {
          user: {
            name: 'João Silva',
            email: 'joao.silva@empresa.com.br',
            role: meRole,
            organizationName: 'ACME',
            avatarUrl: null,
            preferences: { language: meLanguage },
          },
        });
      }

      if (url.endsWith('/api/profile/notifications') && method === 'GET') {
        return makeRes(200, { unreadCount: 3 });
      }

      if (url.endsWith('/api/auth/logout') && method === 'POST') {
        return makeRes(200, {});
      }

      return makeRes(404, { error: 'Not found' });
    }));
  });

  it('abre automaticamente no hover (com delay) e permanece aberto ao passar para o menu', async () => {
    const { container } = render(
      <TopMenu activeModule={undefined} onModuleChange={vi.fn()} />,
    );

    fireEvent.mouseEnter(container.firstElementChild!);

    const profileTrigger = screen.getByRole('button', { name: /conta/i });
    await waitFor(() => {
      expect(profileTrigger).not.toBeDisabled();
    });
    fireEvent.mouseEnter(profileTrigger);

    await waitFor(() => {
      expect(screen.getByText(/meu perfil/i)).toBeInTheDocument();
    });

    const menuItem = screen
      .getByText(/meu perfil/i)
      .closest('[data-slot="dropdown-menu-item"]') as HTMLElement | null;
    expect(menuItem).not.toBeNull();

    fireEvent.mouseLeave(profileTrigger);
    fireEvent.mouseEnter(menuItem!);

    await new Promise(r => setTimeout(r, 350));

    expect(screen.getByText(/meu perfil/i)).toBeInTheDocument();
  });

  it('mantém aberto ao mover o cursor do ícone para o cabeçalho do menu', async () => {
    const { container } = render(
      <TopMenu activeModule={undefined} onModuleChange={vi.fn()} />,
    );

    fireEvent.mouseEnter(container.firstElementChild!);

    const profileTrigger = screen.getByRole('button', { name: /conta/i });
    await waitFor(() => {
      expect(profileTrigger).not.toBeDisabled();
    });
    fireEvent.mouseEnter(profileTrigger);

    await waitFor(() => {
      expect(screen.getByText(/meu perfil/i)).toBeInTheDocument();
    });

    const menuContent = screen
      .getByText(/meu perfil/i)
      .closest('[data-slot="dropdown-menu-content"]') as HTMLElement | null;
    expect(menuContent).not.toBeNull();

    expect(await within(menuContent!).findByText(/administrador\s*-\s*acme/i)).toBeInTheDocument();

    fireEvent.mouseLeave(profileTrigger);
    fireEvent.mouseEnter(menuContent!);

    await new Promise(r => setTimeout(r, 350));

    expect(screen.getByText(/meu perfil/i)).toBeInTheDocument();
  });

  it('exibe label em inglês quando language=en-US', async () => {
    meLanguage = 'en-US';
    const { container } = render(
      <TopMenu activeModule={undefined} onModuleChange={vi.fn()} />,
    );

    fireEvent.mouseEnter(container.firstElementChild!);

    const profileTrigger = screen.getByRole('button', { name: /conta/i });
    await waitFor(() => {
      expect(profileTrigger).not.toBeDisabled();
    });
    fireEvent.mouseEnter(profileTrigger);

    await waitFor(() => {
      expect(screen.getByText(/meu perfil/i)).toBeInTheDocument();
    });

    const menuContent = screen
      .getByText(/meu perfil/i)
      .closest('[data-slot="dropdown-menu-content"]') as HTMLElement | null;
    expect(menuContent).not.toBeNull();

    expect(await within(menuContent!).findByText(/administrator\s*-\s*acme/i)).toBeInTheDocument();
  });

  it('fecha automaticamente ao sair de qualquer opção e permanecer fora por 300ms', async () => {
    const { container } = render(
      <TopMenu activeModule={undefined} onModuleChange={vi.fn()} />,
    );

    fireEvent.mouseEnter(container.firstElementChild!);

    const profileTrigger = screen.getByRole('button', { name: /conta/i });
    await waitFor(() => {
      expect(profileTrigger).not.toBeDisabled();
    });
    fireEvent.mouseEnter(profileTrigger);

    await waitFor(() => {
      expect(screen.getByText(/meu perfil/i)).toBeInTheDocument();
    });

    const menuItem = screen
      .getByText(/meu perfil/i)
      .closest('[data-slot="dropdown-menu-item"]') as HTMLElement | null;
    expect(menuItem).not.toBeNull();

    fireEvent.mouseLeave(profileTrigger);
    fireEvent.mouseEnter(menuItem!);

    await new Promise(r => setTimeout(r, 50));

    fireEvent.mouseLeave(menuItem!);

    await waitFor(
      () => {
        expect(screen.queryByText(/meu perfil/i)).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it('abre no primeiro clique e não pisca ao sair do hover', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TopMenu activeModule={undefined} onModuleChange={vi.fn()} />,
    );

    fireEvent.mouseEnter(container.firstElementChild!);

    const profileTrigger = screen.getByRole('button', { name: /conta/i });
    await user.click(profileTrigger);

    fireEvent.mouseLeave(container.firstElementChild!);

    expect(await screen.findByText(/meu perfil/i)).toBeInTheDocument();
  });

  it('fecha ao clicar novamente no ícone', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TopMenu activeModule={undefined} onModuleChange={vi.fn()} />,
    );

    fireEvent.mouseEnter(container.firstElementChild!);

    const profileTrigger = screen.getByRole('button', { name: /conta/i });
    await user.click(profileTrigger);
    expect(await screen.findByText(/meu perfil/i)).toBeInTheDocument();

    fireEvent.pointerDown(profileTrigger);
    fireEvent.pointerUp(profileTrigger);
    fireEvent.click(profileTrigger);
    await waitFor(() => {
      expect(screen.queryByText(/meu perfil/i)).not.toBeInTheDocument();
    });
  });

  it('fecha ao clicar fora do menu', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TopMenu activeModule={undefined} onModuleChange={vi.fn()} />,
    );

    fireEvent.mouseEnter(container.firstElementChild!);

    const profileTrigger = screen.getByRole('button', { name: /conta/i });
    await user.click(profileTrigger);
    expect(await screen.findByText(/meu perfil/i)).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    fireEvent.pointerUp(document.body);

    await waitFor(() => {
      expect(screen.queryByText(/meu perfil/i)).not.toBeInTheDocument();
    });
  });

  it('navega corretamente pelos itens do menu', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TopMenu activeModule={undefined} onModuleChange={vi.fn()} />,
    );

    const openModulesMenu = async () => {
      fireEvent.mouseEnter(container.firstElementChild!);
      return await screen.findByRole('button', { name: /conta/i });
    };

    const openProfileMenu = async () => {
      const profileTrigger = await openModulesMenu();
      await waitFor(() => {
        expect(profileTrigger).not.toBeDisabled();
      });
      await user.click(profileTrigger);
      expect(await screen.findByText(/meu perfil/i)).toBeInTheDocument();
      return profileTrigger;
    };

    await openProfileMenu();
    await user.click(screen.getByText('Meu Perfil'));
    expect(navigateMock).toHaveBeenCalledWith('/perfil?tab=profile');
    await waitFor(() => {
      expect(screen.queryByText(/meu perfil/i)).not.toBeInTheDocument();
    });

    await openProfileMenu();
    await user.click(screen.getByText('Configurações'));
    expect(navigateMock).toHaveBeenCalledWith('/perfil?tab=preferences');
    await waitFor(() => {
      expect(screen.queryByText(/meu perfil/i)).not.toBeInTheDocument();
    });

    await openProfileMenu();
    await user.click(screen.getByText('Notificações'));
    expect(navigateMock).toHaveBeenCalledWith('/perfil?tab=notifications');
    await waitFor(() => {
      expect(screen.queryByText(/meu perfil/i)).not.toBeInTheDocument();
    });

    await openProfileMenu();
    await user.click(screen.getByText('Ajuda e Suporte'));
    expect(navigateMock).toHaveBeenCalledWith('/perfil?tab=support');
    await waitFor(() => {
      expect(screen.queryByText(/meu perfil/i)).not.toBeInTheDocument();
    });

    await openProfileMenu();
    await user.click(screen.getByText('Sair'));
    await waitFor(() => {
      expect(screen.queryByText(/meu perfil/i)).not.toBeInTheDocument();
    });
  }, 15000);

  it('exibe o módulo Configurações apenas para Administrador', async () => {
    const { container } = render(
      <TopMenu activeModule={undefined} onModuleChange={vi.fn()} />,
    );

    fireEvent.mouseEnter(container.firstElementChild!);

    await waitFor(() => {
      expect(screen.getByTitle('Configurações')).toBeInTheDocument();
    });
  });

  it('oculta o módulo Configurações para usuário comum', async () => {
    meRole = 'User';
    const { container } = render(
      <TopMenu activeModule={undefined} onModuleChange={vi.fn()} />,
    );

    fireEvent.mouseEnter(container.firstElementChild!);

    await waitFor(() => {
      expect((globalThis.fetch as any).mock.calls.length).toBeGreaterThan(0);
    });

    expect(screen.queryByTitle('Configurações')).not.toBeInTheDocument();
  });
});
