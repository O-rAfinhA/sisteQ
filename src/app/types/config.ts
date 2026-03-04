// Tipos compartilhados para configurações do sistema

import { getFromStorage } from '../utils/helpers';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  departamento: string;
  funcao: string;
  tipo: 'sistema' | 'pessoa'; // sistema = acessa o sistema, pessoa = apenas cadastrado
  perfil?: 'master' | 'restrito'; // apenas para tipo 'sistema'
  ativo: boolean;
  dataCadastro: string;
}

export interface Departamento {
  id: string;
  nome: string;
  sigla: string;
  descricao: string;
  ativo: boolean;
  dataCadastro: string;
}

export interface Funcao {
  id: string;
  nome: string;
  nivel: string;
  departamento: string;
  descricao: string;
  requisitos: string;
  ativo: boolean;
  dataCadastro: string;
}

/**
 * Interface centralizada para Colaborador
 * Usada em Colaboradores, MatrizQualificacao, PlanoQualificacao e componentes de RH
 */
export interface Colaborador {
  id: string;
  numero: string;
  nomeCompleto: string;
  nome?: string; // retrocompatibilidade
  dataContratacao: string;
  funcao: string;
  departamento: string;
  email: string;
  telefone: string;
  cpf: string;
  status: 'ativo' | 'inativo';
  dataCriacao: string;
  dataAtualizacao: string;
}

// Helpers para recuperar dados do localStorage
export function getUsuarios(): Usuario[] {
  return getFromStorage<Usuario[]>('usuarios', []);
}

export function getDepartamentos(): Departamento[] {
  return getFromStorage<Departamento[]>('departamentos', []);
}

export function getFuncoes(): Funcao[] {
  return getFromStorage<Funcao[]>('funcoes', []);
}

export function getColaboradores(): Colaborador[] {
  return getFromStorage<Colaborador[]>('sisteq-colaboradores', []);
}

// Helpers para filtrar dados
export function getUsuariosSistema(): Usuario[] {
  return getUsuarios().filter(u => u.tipo === 'sistema' && u.ativo);
}

export function getPessoas(): Usuario[] {
  return getUsuarios().filter(u => u.tipo === 'pessoa' && u.ativo);
}

export function getDepartamentosAtivos(): Departamento[] {
  return getDepartamentos().filter(d => d.ativo);
}

export function getFuncoesAtivas(): Funcao[] {
  return getFuncoes().filter(f => f.ativo);
}

export function getColaboradoresAtivos(): Colaborador[] {
  return getColaboradores().filter(c => c.status === 'ativo');
}

// Helper para obter nomes para dropdowns
export function getUsuariosNomes(): string[] {
  return getUsuarios()
    .filter(u => u.ativo)
    .map(u => u.nome)
    .sort();
}

export function getDepartamentosNomes(): string[] {
  return getDepartamentos()
    .filter(d => d.ativo)
    .map(d => d.nome)
    .sort();
}

export function getFuncoesNomes(): string[] {
  return getFuncoes()
    .filter(f => f.ativo)
    .map(f => f.nome)
    .sort();
}

export function getColaboradoresNomes(): string[] {
  return getColaboradores()
    .filter(c => c.status === 'ativo')
    .map(c => c.nomeCompleto)
    .sort();
}

// Helper para obter departamento de um usuário/pessoa pelo nome
export function getDepartamentoPorUsuario(nomeUsuario: string): string {
  const usuario = getUsuarios().find(u => u.nome === nomeUsuario && u.ativo);
  return usuario?.departamento || '';
}

// Helper para obter dados completos do usuário
export function getUsuarioPorNome(nomeUsuario: string): Usuario | undefined {
  return getUsuarios().find(u => u.nome === nomeUsuario && u.ativo);
}

// Helper para obter dados completos do colaborador
export function getColaboradorPorNomeCompleto(nomeCompleto: string): Colaborador | undefined {
  return getColaboradores().find(c => c.nomeCompleto === nomeCompleto && c.status === 'ativo');
}