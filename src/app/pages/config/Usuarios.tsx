import { UserCog, Plus, Edit2, Trash2, UserCheck, UserX, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ConfigInfo } from '../../components/ConfigInfo';
import { Badge } from '../../components/ui/badge';
import { MetricCard } from '../../components/ui/metric-card';
import { Button } from '../../components/ui/button';
import { generateId, getFromStorage } from '../../utils/helpers';
import { formatarDataHoje } from '../../utils/formatters';
import { useLocalStorage } from '../../hooks';

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

export function Usuarios() {
  const [usuarios, setUsuarios] = useLocalStorage<Usuario[]>('usuarios', []);
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [funcoes, setFuncoes] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'sistema' | 'pessoa'>('todos');
  const [formData, setFormData] = useState<Omit<Usuario, 'id' | 'dataCadastro'>>({
    nome: '',
    email: '',
    departamento: '',
    funcao: '',
    tipo: 'sistema',
    perfil: 'restrito',
    ativo: true
  });

  // Carregar dados do localStorage
  useEffect(() => {
    // Carregar departamentos
    const deps = getFromStorage<any[]>('departamentos', []);
    setDepartamentos(deps.filter((d: any) => d.ativo).map((d: any) => d.nome));
    
    // Carregar funções
    const funcs = getFromStorage<any[]>('funcoes', []);
    setFuncoes(funcs.filter((f: any) => f.ativo).map((f: any) => f.nome));
  }, []);

  const handleAdd = () => {
    if (!formData.nome || !formData.email) {
      alert('Por favor, preencha pelo menos Nome e E-mail');
      return;
    }

    const newUsuario: Usuario = {
      id: generateId(),
      ...formData,
      dataCadastro: formatarDataHoje()
    };

    const updated = [...usuarios, newUsuario];
    setUsuarios(updated);
    resetForm();
    setIsAdding(false);
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingId(usuario.id);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      departamento: usuario.departamento,
      funcao: usuario.funcao,
      tipo: usuario.tipo,
      perfil: usuario.perfil,
      ativo: usuario.ativo
    });
  };

  const handleUpdate = () => {
    if (!formData.nome || !formData.email) {
      alert('Por favor, preencha pelo menos Nome e E-mail');
      return;
    }

    const updated = usuarios.map(usuario =>
      usuario.id === editingId
        ? { ...usuario, ...formData }
        : usuario
    );
    setUsuarios(updated);
    resetForm();
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este usuário/pessoa?')) {
      const updated = usuarios.filter(usuario => usuario.id !== id);
      setUsuarios(updated);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      departamento: '',
      funcao: '',
      tipo: 'sistema',
      perfil: 'restrito',
      ativo: true
    });
  };

  const handleCancel = () => {
    resetForm();
    setIsAdding(false);
    setEditingId(null);
  };

  const usuariosFiltrados = usuarios.filter(u => {
    if (filtroTipo === 'todos') return true;
    return u.tipo === filtroTipo;
  });

  const totalSistema = usuarios.filter(u => u.tipo === 'sistema').length;
  const totalPessoas = usuarios.filter(u => u.tipo === 'pessoa').length;
  const totalMaster = usuarios.filter(u => u.tipo === 'sistema' && u.perfil === 'master').length;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
        {/* Cabeçalho */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCog className="w-8 h-8 text-blue-600" />
              <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>Usuários e Pessoas</h1>
            </div>
            <Button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Novo Cadastro
            </Button>
          </div>
        </div>

        {/* Cards de Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Usuários Sistema"
            value={totalSistema}
            icon={UserCheck}
            variant="info"
          />
          <MetricCard
            label="Pessoas"
            value={totalPessoas}
            icon={UserX}
            variant="purple"
          />
          <MetricCard
            label="Master"
            value={totalMaster}
            icon={Shield}
            variant="warning"
          />
          <MetricCard
            label="Total"
            value={usuarios.length}
            icon={UserCog}
            variant="success"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-3">
          <button
            onClick={() => setFiltroTipo('todos')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filtroTipo === 'todos'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Todos ({usuarios.length})
          </button>
          <button
            onClick={() => setFiltroTipo('sistema')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filtroTipo === 'sistema'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Usuários Sistema ({totalSistema})
          </button>
          <button
            onClick={() => setFiltroTipo('pessoa')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filtroTipo === 'pessoa'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pessoas ({totalPessoas})
          </button>
        </div>

        {/* Formulário de Adição/Edição */}
        {(isAdding || editingId) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
              {editingId ? 'Editar Cadastro' : 'Novo Cadastro'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departamento
                </label>
                <select
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecione um departamento</option>
                  {departamentos.map(dep => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Função
                </label>
                <select
                  value={formData.funcao}
                  onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecione uma função</option>
                  {funcoes.map(func => (
                    <option key={func} value={func}>{func}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'sistema' | 'pessoa' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="sistema">Usuário do Sistema</option>
                  <option value="pessoa">Pessoa Cadastrada</option>
                </select>
              </div>

              {formData.tipo === 'sistema' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Perfil de Acesso *
                  </label>
                  <select
                    value={formData.perfil}
                    onChange={(e) => setFormData({ ...formData, perfil: e.target.value as 'master' | 'restrito' })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="master">Master (Acesso Total)</option>
                    <option value="restrito">Restrito (Apenas suas tarefas)</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-200 rounded focus:ring-blue-500"
                />
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Cadastro Ativo
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingId ? 'Atualizar' : 'Adicionar'}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Tabela */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {usuariosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="w-16 h-16 text-blue-200 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                Nenhum cadastro encontrado
              </h3>
              <p className="text-gray-600 mb-4">
                Comece adicionando um novo usuário ou pessoa
              </p>
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Novo Cadastro
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Nome</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>E-mail</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Departamento</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Função</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Tipo</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Perfil</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                    <th className="px-4 py-3 text-center text-xs text-gray-500 w-24" style={{ fontWeight: 500 }}>Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{usuario.nome}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{usuario.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{usuario.departamento || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{usuario.funcao || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          usuario.tipo === 'sistema'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {usuario.tipo === 'sistema' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          {usuario.tipo === 'sistema' ? 'Sistema' : 'Pessoa'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {usuario.tipo === 'sistema' && usuario.perfil && (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            usuario.perfil === 'master'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            <Shield className="w-3 h-3" />
                            {usuario.perfil === 'master' ? 'Master' : 'Restrito'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          usuario.ativo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {usuario.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(usuario)}
                            className="text-blue-600 hover:bg-blue-50"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(usuario.id)}
                            className="text-red-600 hover:bg-red-50"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </div>
  );
}