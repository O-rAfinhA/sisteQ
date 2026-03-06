import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Landing from './Landing';

const navigateMock = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../utils/helpers', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../utils/helpers')>();
  return {
    ...mod,
    trackEvent: vi.fn(),
  };
});

describe('Landing', () => {
  it('redireciona para /login ao clicar em "Entrar"', async () => {
    navigateMock.mockReset();
    render(<Landing />);

    expect(navigateMock).not.toHaveBeenCalled();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));
    expect(navigateMock).toHaveBeenCalledWith('/login?next=%2Fgestao-estrategica');
  });

  it('redireciona para cadastro ao clicar em "Criar conta grátis"', async () => {
    navigateMock.mockReset();
    render(<Landing />);

    const user = userEvent.setup();
    const buttons = screen.getAllByRole('button', { name: /^criar conta grátis$/i });
    await user.click(buttons[0]);
    expect(navigateMock).toHaveBeenCalledWith('/login?mode=register&next=%2Fgestao-estrategica');
  });

  it('redireciona para cadastro ao clicar em "Criar conta agora"', async () => {
    navigateMock.mockReset();
    render(<Landing />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^criar conta agora$/i }));
    expect(navigateMock).toHaveBeenCalledWith('/login?mode=register&next=%2Fgestao-estrategica');
  });

  it('redireciona para cadastro ao clicar em "Criar minha conta"', async () => {
    navigateMock.mockReset();
    render(<Landing />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^criar minha conta$/i }));
    expect(navigateMock).toHaveBeenCalledWith('/login?mode=register&next=%2Fgestao-estrategica');
  });
});
