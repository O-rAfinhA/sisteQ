import { Building2, Plus, Edit2, Trash2 } from 'lucide-react';
import { generateId } from '../../utils/helpers';
import { formatarDataHoje } from '../../utils/formatters';
import { MetricCard } from '../../components/ui/metric-card';
import { Button } from '../../components/ui/button';
import { useState } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

export interface Departamento {
  id: string;
  nome: string;
  sigla: string;
  descricao: string;
  ativo: boolean;
  dataCadastro: string;
}

export function Departamentos() {
  const [departamentos, setDepartamentos] = useLocalStorage<Departamento[]>('departamentos', []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Departamento, 'id' | 'dataCadastro'>>({
    nome: '',
    sigla: '',
    descricao: '',
    ativo: true
  });

  const handleAdd = () => {
    if (!formData.nome) {
      alert('Por favor, preencha o nome do departamento');
      return;
    }

    const newDepartamento: Departamento = {
      id: generateId(),
      ...formData,
      dataCadastro: formatarDataHoje()
    };

    setDepartamentos(prev => [...prev, newDepartamento]);
    resetForm();
    setIsAdding(false);
  };

  const handleEdit = (departamento: Departamento) => {
    setEditingId(departamento.id);
    setFormData({
      nome: departamento.nome,
      sigla: departamento.sigla,
      descricao: departamento.descricao,
      ativo: departamento.ativo
    });
  };

  const handleUpdate = () => {
    if (!formData.nome) {
      alert('Por favor, preencha o nome do departamento');
      return;
    }

    const updated = departamentos.map(departamento =>
      departamento.id === editingId
        ? { ...departamento, ...formData }
        : departamento
    );
    setDepartamentos(updated);
    resetForm();
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este departamento?')) {
      setDepartamentos(prev => prev.filter(departamento => departamento.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      sigla: '',
      descricao: '',
      ativo: true
    });
  };

  const handleCancel = () => {
    resetForm();
    setIsAdding(false);
    setEditingId(null);
  };

  const totalAtivos = departamentos.filter(d => d.ativo).length;
  const isManagingRecord = isAdding || Boolean(editingId);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
        {/* Cabeçalho */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-purple-600" />
              <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>Departamentos</h1>
            </div>
            {!isManagingRecord && (
              <Button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
                Novo Departamento
              </Button>
            )}
          </div>
        </div>

        {/* Cards de Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            label="Total"
            value={departamentos.length}
            icon={Building2}
            variant="purple"
          />
          <MetricCard
            label="Ativos"
            value={totalAtivos}
            icon={Building2}
            variant="success"
          />
        </div>

        {/* Formulário de Adição/Edição */}
        {(isAdding || editingId) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
              {editingId ? 'Editar Departamento' : 'Novo Departamento'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Departamento *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="Nome do departamento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sigla
                </label>
                <input
                  type="text"
                  value={formData.sigla}
                  onChange={(e) => setFormData({ ...formData, sigla: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ex: RH, TI, FIN..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ex: Responsável pelo planejamento..."
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 text-purple-600 border-gray-200 rounded focus:ring-purple-500"
                />
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Departamento Ativo
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
          {departamentos.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-purple-200 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                Nenhum departamento cadastrado
              </h3>
              <p className="text-gray-600 mb-4">
                Comece adicionando um novo departamento
              </p>
              {!isManagingRecord && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Novo Departamento
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Nome</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Sigla</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Descrição</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Cadastro</th>
                    <th className="px-4 py-3 text-center text-xs text-gray-500 w-24" style={{ fontWeight: 500 }}>Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {departamentos.map((departamento) => (
                    <tr key={departamento.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-purple-500" />
                          {departamento.nome}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {departamento.sigla && (
                          <span className="inline-flex px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                            {departamento.sigla}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {departamento.descricao || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          departamento.ativo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {departamento.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {departamento.dataCadastro}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(departamento)}
                            className="text-blue-600 hover:bg-blue-50"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(departamento.id)}
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
