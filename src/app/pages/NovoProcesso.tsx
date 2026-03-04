import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { useStrategic } from '../context/StrategicContext';
import { Processo, AtividadeProcesso } from '../types/strategic';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

export default function NovoProcesso() {
  const navigate = useNavigate();
  const { dados, addProcesso } = useStrategic();
  
  // Gerar código MP automático
  const gerarCodigoMP = () => {
    const processos = dados.processos || [];
    const numeroAtual = processos.length + 1;
    return `MP${numeroAtual.toString().padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState<Partial<Processo>>({
    codigo: gerarCodigoMP(),
    nome: '',
    departamento: '',
    tipo: 'Operacional',
    status: 'Rascunho',
    objetivo: '',
    versaoAtual: '1.0',
    atividades: []
  });

  // Atualizar código quando a lista de processos mudar
  useEffect(() => {
    setFormData(prev => ({ ...prev, codigo: gerarCodigoMP() }));
  }, [dados.processos?.length]);

  const [novaAtividade, setNovaAtividade] = useState({
    nome: '',
    descricao: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.codigo || !formData.nome || !formData.departamento) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const novoProcesso: Processo = {
      id: crypto.randomUUID(),
      codigo: formData.codigo,
      nome: formData.nome,
      departamento: formData.departamento,
      tipo: formData.tipo || 'Operacional',
      status: formData.status || 'Rascunho',
      objetivo: formData.objetivo || '',
      versaoAtual: '1.0',
      dataCriacao: new Date().toISOString(),
      ultimaAtualizacao: new Date().toISOString(),
      atividades: formData.atividades || [],
      entradas: [],
      saidas: [],
      funcoes: [],
      recursos: [],
      indicadores: [],
      riscos: [],
      documentos: [],
      registros: [],
      versoes: []
    };

    addProcesso(novoProcesso);
    toast.success('Processo criado com sucesso!');
    navigate(`/processos/${novoProcesso.id}`);
  };

  const handleAddAtividade = () => {
    if (!novaAtividade.nome) {
      toast.error('Preencha o nome da atividade');
      return;
    }

    const atividade: AtividadeProcesso = {
      id: crypto.randomUUID(),
      nome: novaAtividade.nome,
      descricao: novaAtividade.descricao,
      responsavel: '', // Será preenchido posteriormente
      ordem: (formData.atividades?.length || 0) + 1
    };

    setFormData(prev => ({
      ...prev,
      atividades: [...(prev.atividades || []), atividade]
    }));

    setNovaAtividade({
      nome: '',
      descricao: ''
    });

    toast.success('Atividade adicionada!');
  };

  const handleRemoveAtividade = (id: string) => {
    setFormData(prev => ({
      ...prev,
      atividades: (prev.atividades || []).filter(a => a.id !== id)
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/processos')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>Novo Processo</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {/* Informações Básicas */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
              Informações Básicas
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código do Processo *
                </label>
                <Input
                  value={formData.codigo}
                  disabled
                  className="bg-gray-50"
                  placeholder="Gerado automaticamente"
                />
                <p className="text-xs text-gray-500 mt-1">Código gerado automaticamente</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Processo *
                </label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Gestão de Vendas"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento *
                </label>
                <Input
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  placeholder="Ex: Comercial"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Processo
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="Estratégico">Estratégico</option>
                  <option value="Operacional">Operacional</option>
                  <option value="Suporte">Suporte</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="Rascunho">Rascunho</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Arquivado">Arquivado</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objetivo
              </label>
              <Textarea
                value={formData.objetivo}
                onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                placeholder="Descreva o objetivo deste processo..."
                rows={3}
              />
            </div>
          </div>

          {/* Atividades do Processo */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
              Atividades do Processo
            </h3>

            {/* Lista de Atividades */}
            {formData.atividades && formData.atividades.length > 0 && (
              <div className="space-y-3 mb-6">
                {formData.atividades.map((atividade, index) => (
                  <div
                    key={atividade.id}
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{atividade.nome}</p>
                      {atividade.descricao && (
                        <p className="text-sm text-gray-600 mt-1">{atividade.descricao}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAtividade(atividade.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Adicionar Nova Atividade */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Adicionar Atividade
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Atividade *
                  </label>
                  <Input
                    value={novaAtividade.nome}
                    onChange={(e) => setNovaAtividade({ ...novaAtividade, nome: e.target.value })}
                    placeholder="Ex: Análise de requisitos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição (opcional)
                  </label>
                  <Textarea
                    value={novaAtividade.descricao}
                    onChange={(e) => setNovaAtividade({ ...novaAtividade, descricao: e.target.value })}
                    placeholder="Descreva detalhes sobre esta atividade..."
                    rows={2}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddAtividade}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Atividade
                </Button>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/processos')}
            >
              Cancelar
            </Button>
            <Button type="submit" className="gap-2">
              <Save className="w-4 h-4" />
              Criar Processo
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}