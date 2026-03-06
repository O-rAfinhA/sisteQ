import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Usuarios } from './Usuarios';
import { Departamentos } from './Departamentos';
import { Funcoes } from './Funcoes';

function createStorage() {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, String(value));
    },
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(window, 'localStorage', { value: createStorage(), configurable: true });
  vi.stubGlobal('alert', vi.fn());
  vi.stubGlobal('confirm', vi.fn(() => true));
});

describe('Visibilidade do botão de cadastro', () => {
  it('Usuários: oculta "Novo Cadastro" durante criação e restaura em cancelar/salvar', async () => {
    render(<Usuarios />);
    const user = userEvent.setup();

    expect(screen.getAllByRole('button', { name: /novo cadastro/i })).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: /novo cadastro/i })[0]);
    expect(screen.queryByRole('button', { name: /novo cadastro/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.getAllByRole('button', { name: /novo cadastro/i })).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: /novo cadastro/i })[0]);
    await user.type(screen.getByPlaceholderText(/nome completo/i), 'Pessoa Teste');
    await user.type(screen.getByPlaceholderText(/email@exemplo\.com/i), 'pessoa.teste@example.com');
    await user.selectOptions(screen.getByDisplayValue('Usuário do Sistema'), 'pessoa');

    await user.click(screen.getByRole('button', { name: /adicionar/i }));
    expect(screen.getAllByRole('button', { name: /novo cadastro/i })).toHaveLength(1);
  });

  it('Usuários: oculta "Novo Cadastro" durante edição e restaura ao cancelar', async () => {
    window.localStorage.setItem(
      'usuarios',
      JSON.stringify([
        {
          id: 'u1',
          nome: 'Pessoa',
          email: 'pessoa@example.com',
          departamento: '',
          funcao: '',
          tipo: 'pessoa',
          ativo: true,
          dataCadastro: '01/01/2026',
        },
      ]),
    );

    render(<Usuarios />);
    const user = userEvent.setup();

    expect(screen.getAllByRole('button', { name: /novo cadastro/i })).toHaveLength(1);

    await user.click(screen.getByTitle('Editar'));
    expect(screen.queryByRole('button', { name: /novo cadastro/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.getAllByRole('button', { name: /novo cadastro/i })).toHaveLength(1);
  });

  it('Departamentos: oculta "Novo Departamento" durante criação e restaura ao cancelar', async () => {
    render(<Departamentos />);
    const user = userEvent.setup();

    expect(screen.getAllByRole('button', { name: /novo departamento/i })).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: /novo departamento/i })[0]);
    expect(screen.queryByRole('button', { name: /novo departamento/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.getAllByRole('button', { name: /novo departamento/i })).toHaveLength(2);
  });

  it('Departamentos: oculta "Novo Departamento" durante edição e restaura ao salvar', async () => {
    window.localStorage.setItem(
      'departamentos',
      JSON.stringify([
        {
          id: 'd1',
          nome: 'TI',
          sigla: 'TI',
          descricao: '',
          ativo: true,
          dataCadastro: '01/01/2026',
        },
      ]),
    );

    render(<Departamentos />);
    const user = userEvent.setup();

    expect(screen.getAllByRole('button', { name: /novo departamento/i })).toHaveLength(1);

    await user.click(screen.getByTitle('Editar'));
    expect(screen.queryByRole('button', { name: /novo departamento/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /atualizar/i }));
    expect(screen.getAllByRole('button', { name: /novo departamento/i })).toHaveLength(1);
  });

  it('Funções: oculta "Nova Função" durante criação e restaura ao salvar', async () => {
    render(<Funcoes />);
    const user = userEvent.setup();

    expect(screen.getAllByRole('button', { name: /nova função/i })).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: /nova função/i })[0]);
    expect(screen.queryByRole('button', { name: /nova função/i })).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/nome da função/i), 'Analista');
    await user.click(screen.getByRole('button', { name: /adicionar/i }));

    expect(screen.getAllByRole('button', { name: /nova função/i })).toHaveLength(1);
  });

  it('Funções: oculta "Nova Função" durante edição e restaura ao cancelar', async () => {
    window.localStorage.setItem(
      'funcoes',
      JSON.stringify([
        {
          id: 'f1',
          nome: 'Analista',
          nivel: '',
          departamento: '',
          ativo: true,
          dataCadastro: '01/01/2026',
        },
      ]),
    );

    render(<Funcoes />);
    const user = userEvent.setup();

    expect(screen.getAllByRole('button', { name: /nova função/i })).toHaveLength(1);

    await user.click(screen.getByTitle('Editar'));
    expect(screen.queryByRole('button', { name: /nova função/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.getAllByRole('button', { name: /nova função/i })).toHaveLength(1);
  });
});

