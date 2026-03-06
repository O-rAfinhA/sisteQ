import { generateId, getFromStorage } from '../../utils/helpers';
import { formatarDataHoje } from '../../utils/formatters';
import { MetricCard } from '../../components/ui/metric-card';
import { Button } from '../../components/ui/button';
import { useState, useEffect } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Briefcase, Plus, Edit2, Trash2 } from 'lucide-react';

export interface Funcao {
  id: string;
  nome: string;
  nivel: string;
  departamento: string;
  ativo: boolean;
  dataCadastro: string;
}

export function Funcoes() {
  const [funcoes, setFuncoes] = useLocalStorage<Funcao[]>('funcoes', []);
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Funcao, 'id' | 'dataCadastro'>>({
    nome: '',
    nivel: '',
    departamento: '',
    ativo: true
  });

  // Carregar departamentos
  useEffect(() => {
    const deps = getFromStorage<any[]>('departamentos', []);
    setDepartamentos(deps.filter((d: any) => d.ativo).map((d: any) => d.nome));
  }, []);

  const handleAdd = () => {
    if (!formData.nome) {
      alert('Por favor, preencha o nome da função');
      return;
    }

    const newFuncao: Funcao = {
      id: generateId(),
      ...formData,
      dataCadastro: formatarDataHoje()
    };

    setFuncoes(prev => [...prev, newFuncao]);
    resetForm();
    setIsAdding(false);
  };

  const handleEdit = (funcao: Funcao) => {
    setEditingId(funcao.id);
    setFormData({
      nome: funcao.nome,
      nivel: funcao.nivel,
      departamento: funcao.departamento,
      ativo: funcao.ativo
    });
  };

  const handleUpdate = () => {
    if (!formData.nome) {
      alert('Por favor, preencha o nome da função');
      return;
    }

    const updated = funcoes.map(funcao =>
      funcao.id === editingId
        ? { ...funcao, ...formData }
        : funcao
    );
    setFuncoes(updated);
    resetForm();
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir esta função?')) {
      setFuncoes(prev => prev.filter(funcao => funcao.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      nivel: '',
      departamento: '',
      ativo: true
    });
  };

  const handleCancel = () => {
    resetForm();
    setIsAdding(false);
    setEditingId(null);
  };

  const totalAtivos = funcoes.filter(f => f.ativo).length;
  const isManagingRecord = isAdding || Boolean(editingId);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
        {/* Cabeçalho */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-orange-600" />
              <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>Cadastro de Funções</h1>
            </div>
            {!isManagingRecord && (
              <Button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 bg-orange-600 text-white hover:bg-orange-700"
              >
                <Plus className="w-4 h-4" />
                Nova Função
              </Button>
            )}
          </div>
        </div>

        {/* Cards de Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            label="Total"
            value={funcoes.length}
            icon={Briefcase}
            variant="warning"
          />
          <MetricCard
            label="Ativas"
            value={totalAtivos}
            icon={Briefcase}
            variant="success"
          />
        </div>

        {/* Formulário de Adição/Edição */}
        {(isAdding || editingId) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
              {editingId ? 'Editar Função' : 'Nova Função'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Função *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="Nome da função"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nível Hierárquico
                </label>
                <select
                  value={formData.nivel}
                  onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  <option value="Direção">Direção</option>
                  <option value="Gerência">Gerência</option>
                  <option value="Coordenação">Coordenação</option>
                  <option value="Supervisão">Supervisão</option>
                  <option value="Operacional">Operacional</option>
                </select>
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
                  {departamentos.map((dep) => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 text-orange-600 border-gray-200 rounded focus:ring-orange-500"
                />
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Função Ativa
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
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
          {funcoes.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 text-orange-200 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                Nenhuma função cadastrada
              </h3>
              <p className="text-gray-600 mb-4">
                Comece adicionando uma nova função
              </p>
              {!isManagingRecord && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nova Função
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Nome</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Nível</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Departamento</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                    <th className="px-4 py-3 text-center text-xs text-gray-500 w-24" style={{ fontWeight: 500 }}>Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {funcoes.map((funcao) => (
                    <tr key={funcao.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-orange-500" />
                          {funcao.nome}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {funcao.nivel && (
                          <span className="inline-flex px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                            {funcao.nivel}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {funcao.departamento || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          funcao.ativo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {funcao.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(funcao)}
                            className="text-blue-600 hover:bg-blue-50"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(funcao.id)}
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
