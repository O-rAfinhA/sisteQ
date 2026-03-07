import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Login from './Login';

const navigateMock = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Login', () => {
  it('exibe opção de criar conta e alterna para o modo de registro', () => {
    render(<Login />);

    expect(screen.getAllByText('Entrar').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(screen.getAllByText('Criar conta').length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/^empresa$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nome$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^e-mail$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument();
  });

  it('exige confirmação por código após cadastro (mesmo em dev)', async () => {
    const fetchMock = vi.fn(async (input: any) => {
      const url = typeof input === 'string' ? input : input?.url;
      if (url === '/api/auth/register') {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            ok: true,
            emailSent: false,
            verificationRequired: true,
            verificationMethod: 'code',
            dev: { verificationCode: 'ABC123' },
          }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    });
    (globalThis as any).fetch = fetchMock;

    render(<Login />);

    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    fireEvent.change(screen.getByLabelText(/organização/i), { target: { value: 'acme' } });
    fireEvent.change(screen.getByLabelText(/^empresa$/i), { target: { value: 'ACME Ltda' } });
    fireEvent.change(screen.getByLabelText(/^nome$/i), { target: { value: 'Admin' } });
    fireEvent.change(screen.getByLabelText(/^e-mail$/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'Senha@12345' } });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'Senha@12345' } });

    fireEvent.click(screen.getByRole('button', { name: /^criar conta$/i }));

    const codeInput = (await screen.findByLabelText(/código de verificação/i)) as HTMLInputElement;
    expect(codeInput.value).toBe('ABC123');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('exibe formulário de código quando login falha por e-mail não verificado', async () => {
    const fetchMock = vi.fn(async () => {
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: 'E-mail não verificado' }),
      } as any;
    });
    (globalThis as any).fetch = fetchMock;

    render(<Login />);

    fireEvent.change(screen.getByLabelText(/organização/i), { target: { value: 'acme' } });
    fireEvent.change(screen.getByLabelText(/^e-mail$/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'Senha@12345' } });

    fireEvent.click(screen.getByRole('button', { name: /^entrar$/i }));

    expect(await screen.findByLabelText(/código de verificação/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar e-mail/i })).toBeInTheDocument();
  });
});
