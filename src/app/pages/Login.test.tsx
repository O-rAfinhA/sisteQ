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
});
