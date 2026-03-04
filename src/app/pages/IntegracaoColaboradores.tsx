import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { generateId, getFromStorage } from '../utils/helpers';
import { formatarDataPtBr } from '../utils/formatters';
import { useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  List,
  Settings,
  Search,
  Calendar,
  User as UserIcon,
  Eye,
  Users,
  Plus,
  Layers,
  FileText,
  ChevronDown,
  ChevronRight,
  Save,
  Trash2,
  X,
  Edit2,
  Building2
} from 'lucide-react';

// Interfaces NOVAS - Fichas de Integração
interface ItemFichaIntegracao {
  id: string;
  ordem: string; // Ex: "1.1", "1.2", "2.1"
  descricao: string;
  orientacoes?: string;
}

interface SetorFichaIntegracao {
  id: string;
  ordem: number; // Ex: 1, 2, 3
  titulo: string; // Ex: "RECURSOS HUMANOS", "SEGURANÇA"
  itens: ItemFichaIntegracao[];
}

interface FichaIntegracao {
  id: string;
  nome: string; // Ex: "Integração Administrativo", "Integração Produção"
  descricao: string;
  setores: SetorFichaIntegracao[];
  dataCriacao: string;
  dataAtualizacao: string;
}

// Interfaces ANTIGAS - Mantidas para compatibilidade
interface ItemIntegracao {
  id: string;
  item: string;
  orientacoes: string;
}

interface DepartamentoIntegracao {
  id: string;
  departamento: string;
  itens: ItemIntegracao[];
  dataCriacao: string;
  dataAtualizacao: string;
}

interface RegistroIntegracao {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  departamento: string;
  funcao: string;
  dataAdmissao: string;
  dataIntegracao: string;
  responsavel: string;
  itensRealizados: {
    item: string;
    realizado: boolean;
    observacao: string;
  }[];
  observacoes: string;
  status: 'concluida' | 'em-andamento' | 'pendente';
}

export function IntegracaoColaboradores() {
  const [activeTab, setActiveTab] = useState<'lista' | 'configuracao'>('lista');
  
  // Estados NOVOS - Fichas de Integração
  const [fichas, setFichas] = useLocalStorage<FichaIntegracao[]>('sisteq-fichas-integracao', []);
  const [fichaEditando, setFichaEditando] = useState<FichaIntegracao | null>(null);
  const [showNovaFicha, setShowNovaFicha] = useState(false);
  const [searchFicha, setSearchFicha] = useState('');
  const [setorExpandido, setSetorExpandido] = useState<{ [key: string]: boolean }>({});

  // Estados da lista de integrações
  const [todasIntegracoes, setTodasIntegracoes] = useState<RegistroIntegracao[]>([]);
  const [integracaoSelecionada, setIntegracaoSelecionada] = useState<RegistroIntegracao | null>(null);
  const [searchIntegracao, setSearchIntegracao] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  useEffect(() => {
    loadAllIntegracoes();
  }, []);

  const loadAllIntegracoes = () => {
    const colaboradores = getFromStorage<any[]>('sisteq-colaboradores', []);
    if (colaboradores.length === 0) {
      setTodasIntegracoes([]);
      return;
    }

    const configIntegracoes = getFromStorage<any[]>('sisteq-integracao-colaboradores', []);
    const allIntegracoes: RegistroIntegracao[] = [];

    colaboradores.forEach((colaborador: any) => {
      const integracoes = getFromStorage<any[]>(`sisteq-registros-integracao-${colaborador.id}`, []);
      if (integracoes.length > 0) {
        integracoes.forEach((integracao: any) => {
          // Buscar configuração do departamento para obter os nomes dos itens
          const configDept = configIntegracoes.find((c: any) => 
            c.departamento.toLowerCase() === integracao.departamento.toLowerCase()
          );
          
          const itensRealizados = integracao.itensOrientados ? integracao.itensOrientados.map((itemId: string) => {
            // Encontrar o nome do item na configuração
            const itemConfig = configDept?.itens?.find((i: any) => i.id === itemId);
            return {
              item: itemConfig?.item || itemId,
              realizado: true,
              observacao: ''
            };
          }) : [];

          allIntegracoes.push({
            id: integracao.id,
            colaboradorId: colaborador.id,
            colaboradorNome: colaborador.nomeCompleto,
            departamento: integracao.departamento || colaborador.departamento || 'Não informado',
            funcao: colaborador.funcao || 'Não informada',
            dataAdmissao: colaborador.dataAdmissao || '',
            dataIntegracao: integracao.dataOrientacao,
            responsavel: integracao.orientador,
            itensRealizados,
            observacoes: integracao.observacoes || '',
            status: 'concluida' as const
          });
        });
      }
    });

    allIntegracoes.sort((a, b) => new Date(b.dataIntegracao).getTime() - new Date(a.dataIntegracao).getTime());
    setTodasIntegracoes(allIntegracoes);
  };

  // Agrupar integrações por colaborador
  const integracoesAgrupadas = todasIntegracoes.reduce((acc, integracao) => {
    const existing = acc.find(item => item.colaboradorId === integracao.colaboradorId);
    if (existing) {
      existing.integracoes.push(integracao);
      // Atualizar data mais recente
      if (new Date(integracao.dataIntegracao) > new Date(existing.dataIntegracaoMaisRecente)) {
        existing.dataIntegracaoMaisRecente = integracao.dataIntegracao;
      }
    } else {
      acc.push({
        colaboradorId: integracao.colaboradorId,
        colaboradorNome: integracao.colaboradorNome,
        funcao: integracao.funcao,
        dataAdmissao: integracao.dataAdmissao,
        dataIntegracaoMaisRecente: integracao.dataIntegracao,
        integracoes: [integracao],
        totalItens: integracao.itensRealizados.length
      });
    }
    return acc;
  }, [] as {
    colaboradorId: string;
    colaboradorNome: string;
    funcao: string;
    dataAdmissao: string;
    dataIntegracaoMaisRecente: string;
    integracoes: RegistroIntegracao[];
    totalItens: number;
  }[]);

  // Filtrar colaboradores agrupados
  const filteredColaboradores = integracoesAgrupadas.filter(colab => {
    const matchSearch = colab.colaboradorNome.toLowerCase().includes(searchIntegracao.toLowerCase()) ||
                       colab.funcao.toLowerCase().includes(searchIntegracao.toLowerCase()) ||
                       colab.integracoes.some(i => 
                         i.departamento.toLowerCase().includes(searchIntegracao.toLowerCase()) ||
                         i.responsavel.toLowerCase().includes(searchIntegracao.toLowerCase())
                       );
    
    let matchData = true;
    if (filtroDataInicio && filtroDataFim) {
      const dataIntegracao = new Date(colab.dataIntegracaoMaisRecente);
      const dataInicio = new Date(filtroDataInicio);
      const dataFim = new Date(filtroDataFim);
      matchData = dataIntegracao >= dataInicio && dataIntegracao <= dataFim;
    }
    
    return matchSearch && matchData;
  });

  const handleDeleteIntegracao = (integracao: RegistroIntegracao) => {
    if (confirm(`Deseja realmente excluir o registro de integração de "${integracao.colaboradorNome}"?`)) {
      const integracoes = getFromStorage<any[]>(`sisteq-registros-integracao-${integracao.colaboradorId}`, []);
      if (integracoes.length > 0) {
        const updated = integracoes.filter((i: any) => i.id !== integracao.id);
        localStorage.setItem(`sisteq-registros-integracao-${integracao.colaboradorId}`, JSON.stringify(updated));
        loadAllIntegracoes();
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'concluida':
        return 'bg-green-100 text-green-700';
      case 'em-andamento':
        return 'bg-yellow-100 text-yellow-700';
      case 'pendente':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'concluida':
        return 'Concluída';
      case 'em-andamento':
        return 'Em Andamento';
      case 'pendente':
        return 'Pendente';
      default:
        return status;
    }
  };

  // ========== FUNÇÕES PARA FICHAS DE INTEGRAÇÃO ==========
  
  const handleNovaFicha = () => {
    const novaFicha: FichaIntegracao = {
      id: generateId(),
      nome: '',
      descricao: '',
      setores: [],
      dataCriacao: new Date().toISOString(),
      dataAtualizacao: new Date().toISOString()
    };
    setFichaEditando(novaFicha);
    setShowNovaFicha(true);
  };

  const handleSalvarFicha = () => {
    if (!fichaEditando) return;

    if (!fichaEditando.nome.trim()) {
      alert('Digite o nome da ficha de integração');
      return;
    }

    if (fichaEditando.setores.length === 0) {
      alert('Adicione pelo menos um setor');
      return;
    }

    // Validar se todos os setores têm título
    const setorSemTitulo = fichaEditando.setores.find(s => !s.titulo.trim());
    if (setorSemTitulo) {
      alert('Todos os setores devem ter um título');
      return;
    }

    const fichaAtualizada = {
      ...fichaEditando,
      dataAtualizacao: new Date().toISOString()
    };

    const fichaExistente = fichas.find(f => f.id === fichaEditando.id);
    let novasFichas;

    if (fichaExistente) {
      novasFichas = fichas.map(f => f.id === fichaEditando.id ? fichaAtualizada : f);
    } else {
      novasFichas = [...fichas, fichaAtualizada];
    }

    setFichas(novasFichas);
    setFichaEditando(null);
    setShowNovaFicha(false);
    alert('Ficha de integração salva com sucesso!');
  };

  const handleEditarFicha = (ficha: FichaIntegracao) => {
    setFichaEditando({ ...ficha });
    setShowNovaFicha(true);
  };

  const handleExcluirFicha = (id: string) => {
    const ficha = fichas.find(f => f.id === id);
    if (ficha && confirm(`Deseja realmente excluir a ficha "${ficha.nome}"?`)) {
      const novasFichas = fichas.filter(f => f.id !== id);
      setFichas(novasFichas);
    }
  };

  const handleAdicionarSetor = () => {
    if (!fichaEditando) return;

    const novoSetor: SetorFichaIntegracao = {
      id: generateId(),
      ordem: fichaEditando.setores.length + 1,
      titulo: '',
      itens: []
    };

    setFichaEditando({
      ...fichaEditando,
      setores: [...fichaEditando.setores, novoSetor]
    });

    // Auto-expandir o novo setor
    setSetorExpandido(prev => ({
      ...prev,
      [novoSetor.id]: true
    }));
  };

  const handleRemoverSetor = (setorId: string) => {
    if (!fichaEditando) return;

    const novasSetores = fichaEditando.setores
      .filter(s => s.id !== setorId)
      .map((s, idx) => ({ ...s, ordem: idx + 1 }));

    setFichaEditando({
      ...fichaEditando,
      setores: novasSetores
    });
  };

  const handleAtualizarSetor = (setorId: string, campo: keyof SetorFichaIntegracao, valor: any) => {
    if (!fichaEditando) return;

    setFichaEditando({
      ...fichaEditando,
      setores: fichaEditando.setores.map(s =>
        s.id === setorId ? { ...s, [campo]: valor } : s
      )
    });
  };

  const handleAdicionarItem = (setorId: string) => {
    if (!fichaEditando) return;

    const setor = fichaEditando.setores.find(s => s.id === setorId);
    if (!setor) return;

    const novoItem: ItemFichaIntegracao = {
      id: generateId(),
      ordem: `${setor.ordem}.${setor.itens.length + 1}`,
      descricao: '',
      orientacoes: ''
    };

    setFichaEditando({
      ...fichaEditando,
      setores: fichaEditando.setores.map(s =>
        s.id === setorId
          ? { ...s, itens: [...s.itens, novoItem] }
          : s
      )
    });
  };

  const handleRemoverItem = (setorId: string, itemId: string) => {
    if (!fichaEditando) return;

    setFichaEditando({
      ...fichaEditando,
      setores: fichaEditando.setores.map(s => {
        if (s.id === setorId) {
          const novosItens = s.itens
            .filter(i => i.id !== itemId)
            .map((item, idx) => ({ ...item, ordem: `${s.ordem}.${idx + 1}` }));
          return { ...s, itens: novosItens };
        }
        return s;
      })
    });
  };

  const handleAtualizarItem = (setorId: string, itemId: string, campo: keyof ItemFichaIntegracao, valor: any) => {
    if (!fichaEditando) return;

    setFichaEditando({
      ...fichaEditando,
      setores: fichaEditando.setores.map(s =>
        s.id === setorId
          ? {
              ...s,
              itens: s.itens.map(i =>
                i.id === itemId ? { ...i, [campo]: valor } : i
              )
            }
          : s
      )
    });
  };

  const toggleSetorExpandido = (setorId: string) => {
    setSetorExpandido(prev => ({
      ...prev,
      [setorId]: !prev[setorId]
    }));
  };

  const filteredFichas = fichas.filter(ficha =>
    ficha.nome.toLowerCase().includes(searchFicha.toLowerCase()) ||
    ficha.descricao.toLowerCase().includes(searchFicha.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
          Integração de Colaboradores
        </h1>
        <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Gerencie os registros de integração e configure fichas completas com múltiplos setores
        </p>
      </div>

      {/* Abas */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('lista')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'lista'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-5 h-5" />
            Registros de Integração
          </button>
          <button
            onClick={() => setActiveTab('configuracao')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'configuracao'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="w-5 h-5" />
            Fichas de Integração
          </button>
        </div>
      </div>

      {/* Conteúdo - Lista de Integrações */}
      {activeTab === 'lista' && (
        <>
          {/* Filtros */}
          {todasIntegracoes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar por colaborador, departamento ou responsável..."
                    value={searchIntegracao}
                    onChange={(e) => setSearchIntegracao(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input
                      type="date"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                      placeholder="Data inicial"
                      className="pl-9"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input
                      type="date"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      placeholder="Data final"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista */}
          {!integracaoSelecionada && (
            <>
              {filteredColaboradores.length > 0 ? (
                <div className="space-y-4">
                  {filteredColaboradores.map((colaborador) => (
                    <div key={colaborador.colaboradorId} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <UserIcon className="w-5 h-5 text-blue-600" />
                              <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>{colaborador.colaboradorNome}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(colaborador.integracoes[0].status)}`}>
                                {getStatusLabel(colaborador.integracoes[0].status)}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{colaborador.integracoes[0].departamento}</span>
                              <span>•</span>
                              <span>{colaborador.funcao}</span>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatarDataPtBr(colaborador.dataIntegracaoMaisRecente)}
                              </div>
                              <span>•</span>
                              <span>Responsável: {colaborador.integracoes[0].responsavel}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIntegracaoSelecionada(colaborador.integracoes[0])}
                              className="text-blue-600 hover:bg-blue-50"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.location.href = `/recursos-humanos/colaboradores`}
                              className="text-green-600 hover:bg-green-50"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteIntegracao(colaborador.integracoes[0])}
                              className="text-red-600 hover:bg-red-50"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 pt-3 border-t border-gray-200">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Itens:</span> {colaborador.totalItens}
                          </div>
                          <span className="text-gray-300">|</span>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Realizados:</span> {colaborador.integracoes[0].itensRealizados.filter(i => i.realizado).length}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-12 text-center">
                  <Users className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-gray-900 mb-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    {searchIntegracao || (filtroDataInicio && filtroDataFim) ? 'Nenhuma integração encontrada' : 'Nenhuma integração registrada'}
                  </h3>
                  <p className="text-gray-600">
                    {searchIntegracao || (filtroDataInicio && filtroDataFim)
                      ? 'Tente ajustar os filtros de busca'
                      : 'Os registros de integração são criados no cadastro de cada colaborador'
                    }
                  </p>
                </div>
              )}
            </>
          )}

          {/* Modal de Visualização */}
          {integracaoSelecionada && (() => {
            // Buscar todas as integrações do colaborador
            const todasIntegracoesColaborador = todasIntegracoes.filter(
              i => i.colaboradorId === integracaoSelecionada.colaboradorId
            );

            return (
              <div className="bg-white rounded-xl border-2 border-blue-300 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-gray-900" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Histórico de Integrações</h2>
                  <button
                    onClick={() => setIntegracaoSelecionada(null)}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Informações do Colaborador */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Colaborador</p>
                      <p className="font-medium text-gray-900">{integracaoSelecionada.colaboradorNome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Função</p>
                      <p className="font-medium text-gray-900">{integracaoSelecionada.funcao}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Total de Integrações</p>
                      <p className="font-medium text-gray-900">{todasIntegracoesColaborador.length}</p>
                    </div>
                  </div>

                  {/* Lista de Integrações por Setor */}
                  <div>
                    <h3 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>Registro de Integrações por Setor/Data</h3>
                    <div className="space-y-4">
                      {todasIntegracoesColaborador.map((integracao, idx) => (
                        <div key={integracao.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                          {/* Cabeçalho da Integração */}
                          <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-300">
                            <div className="flex items-center gap-3">
                              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full text-sm font-semibold">
                                {idx + 1}
                              </span>
                              <div>
                                <h4 className="text-gray-900" style={{ fontWeight: 600 }}>{integracao.departamento}</h4>
                                <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatarDataPtBr(integracao.dataIntegracao)}
                                  </div>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <UserIcon className="w-3 h-3" />
                                    {integracao.responsavel}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(integracao.status)}`}>
                              {getStatusLabel(integracao.status)}
                            </span>
                          </div>

                          {/* Itens Orientados */}
                          {integracao.itensRealizados.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-700 mb-2">Itens Orientados:</p>
                              <div className="space-y-2">
                                {integracao.itensRealizados.map((item, itemIdx) => (
                                  <div key={itemIdx} className="flex items-start gap-2 bg-white rounded border border-gray-200 p-2">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${item.realizado ? 'bg-green-500' : 'bg-gray-400'}`}>
                                      {item.realizado && <span className="text-white text-xs">✓</span>}
                                    </div>
                                    <div className="flex-1">
                                      <div className={`text-sm ${item.realizado ? 'text-green-900' : 'text-gray-900'}`}>{item.item}</div>
                                      {item.observacao && (
                                        <p className="text-xs text-gray-600 mt-1">{item.observacao}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Observações */}
                          {integracao.observacoes && (
                            <div className="bg-yellow-50 rounded border border-yellow-200 p-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Observações:</p>
                              <p className="text-xs text-gray-700 whitespace-pre-wrap">{integracao.observacoes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setIntegracaoSelecionada(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => window.location.href = `/recursos-humanos/colaboradores`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar no Colaborador
                  </button>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* Conteúdo - Configuração - FICHAS DE INTEGRAÇÃO */}
      {activeTab === 'configuracao' && (
        <>
          {/* Lista de Fichas - Quando NÃO está editando */}
          {!showNovaFicha && (
            <div className="space-y-6">
              {/* Cabeçalho com Busca e Botão Nova Ficha */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl text-gray-900" style={{ fontWeight: 600 }}>Fichas de Integração</h2>
                    <p className="text-sm text-gray-600">Configure modelos completos de integração com múltiplos setores</p>
                  </div>
                  <Button
                    onClick={handleNovaFicha}
                    className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Plus className="w-5 h-5" />
                    Nova Ficha
                  </Button>
                </div>

                {/* Busca */}
                {fichas.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Buscar ficha por nome ou descrição..."
                      value={searchFicha}
                      onChange={(e) => setSearchFicha(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}
              </div>

              {/* Lista de Fichas */}
              {filteredFichas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredFichas.map((ficha) => (
                    <div key={ficha.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                      <div className="bg-gray-900 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <Layers className="w-5 h-5 text-white/80 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h3 className="text-white text-base mb-1" style={{ fontWeight: 600 }}>{ficha.nome}</h3>
                              {ficha.descricao && (
                                <p className="text-gray-400 text-sm">{ficha.descricao}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            <span className="font-medium">{ficha.setores.length}</span> setor(es)
                          </div>
                          <span className="text-gray-300">|</span>
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span className="font-medium">
                              {ficha.setores.reduce((total, setor) => total + setor.itens.length, 0)}
                            </span> item(ns)
                          </div>
                        </div>

                        {/* Preview dos Setores */}
                        {ficha.setores.length > 0 && (
                          <div className="bg-gray-50 rounded p-3 mb-4">
                            <p className="text-xs font-medium text-gray-700 mb-2">Setores configurados:</p>
                            <div className="space-y-1">
                              {ficha.setores.slice(0, 3).map((setor) => (
                                <div key={setor.id} className="flex items-center gap-2 text-xs text-gray-600">
                                  <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full font-semibold">
                                    {setor.ordem}
                                  </span>
                                  <span className="flex-1 truncate">{setor.titulo || '(Sem título)'}</span>
                                  <span className="text-gray-400">({setor.itens.length})</span>
                                </div>
                              ))}
                              {ficha.setores.length > 3 && (
                                <p className="text-xs text-gray-500 italic pl-7">
                                  +{ficha.setores.length - 3} setor(es) a mais...
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Botões de Ação */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditarFicha(ficha)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleExcluirFicha(ficha.id)}
                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-12 text-center">
                  <Layers className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-gray-900 mb-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    {searchFicha ? 'Nenhuma ficha encontrada' : 'Nenhuma ficha de integração configurada'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchFicha
                      ? 'Tente buscar com outras palavras-chave'
                      : 'Crie fichas completas de integração com múltiplos setores e itens'
                    }
                  </p>
                  {!searchFicha && (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={handleNovaFicha}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        Criar Primeira Ficha
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Formulário de Edição/Criação de Ficha */}
          {showNovaFicha && fichaEditando && (
            <div className="space-y-6">
              {/* Cabeçalho */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Layers className="w-7 h-7 text-blue-600" />
                    <div>
                      <h2 className="text-xl text-gray-900" style={{ fontWeight: 600 }}>
                        {fichas.find(f => f.id === fichaEditando.id) ? 'Editar Ficha' : 'Nova Ficha'} de Integração
                      </h2>
                      <p className="text-gray-500 text-sm">Configure os setores e itens que serão orientados</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowNovaFicha(false);
                      setFichaEditando(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Dados Principais */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>Informações da Ficha</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Ficha *
                    </label>
                    <input
                      type="text"
                      value={fichaEditando.nome}
                      onChange={(e) => setFichaEditando({ ...fichaEditando, nome: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="Ex: Integração Administrativo, Integração Produção..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição (opcional)
                    </label>
                    <textarea
                      value={fichaEditando.descricao}
                      onChange={(e) => setFichaEditando({ ...fichaEditando, descricao: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="Descrição resumida da ficha..."
                    />
                  </div>
                </div>
              </div>

              {/* Setores */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <h3 className="text-gray-900" style={{ fontWeight: 600 }}>Setores e Itens</h3>
                  </div>
                  <button
                    onClick={handleAdicionarSetor}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Setor
                  </button>
                </div>

                {fichaEditando.setores.length > 0 ? (
                  <div className="space-y-4">
                    {fichaEditando.setores.map((setor) => (
                      <div key={setor.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Cabeçalho do Setor */}
                        <div
                          className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => toggleSetorExpandido(setor.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {setorExpandido[setor.id] ? (
                                <ChevronDown className="w-5 h-5 text-gray-600" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-600" />
                              )}
                              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full text-sm font-semibold">
                                {setor.ordem}
                              </span>
                              <input
                                type="text"
                                value={setor.titulo}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleAtualizarSetor(setor.id, 'titulo', e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-medium"
                                placeholder="Ex: RECURSOS HUMANOS, SEGURANÇA, QUALIDADE..."
                              />
                              <span className="text-sm text-gray-600">
                                {setor.itens.length} item(ns)
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoverSetor(setor.id);
                              }}
                              className="ml-3 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Itens do Setor (Expansível) */}
                        {setorExpandido[setor.id] && (
                          <div className="p-4 bg-white border-t border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-medium text-gray-700">Itens do Setor</p>
                              <button
                                onClick={() => handleAdicionarItem(setor.id)}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                Item
                              </button>
                            </div>

                            {setor.itens.length > 0 ? (
                              <div className="space-y-2">
                                {setor.itens.map((item) => (
                                  <div key={item.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-start gap-2">
                                      <span className="flex-shrink-0 w-12 text-xs font-semibold text-blue-600 mt-2">
                                        {item.ordem}
                                      </span>
                                      <div className="flex-1 space-y-2">
                                        <input
                                          type="text"
                                          value={item.descricao}
                                          onChange={(e) => handleAtualizarItem(setor.id, item.id, 'descricao', e.target.value)}
                                          className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                          placeholder="Descrição do item..."
                                        />
                                        <textarea
                                          value={item.orientacoes || ''}
                                          onChange={(e) => handleAtualizarItem(setor.id, item.id, 'orientacoes', e.target.value)}
                                          rows={2}
                                          className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                          placeholder="Orientações/observações (opcional)..."
                                        />
                                      </div>
                                      <button
                                        onClick={() => handleRemoverItem(setor.id, item.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 text-center py-4 italic">
                                Nenhum item adicionado. Clique em "+ Item" para começar.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-8">
                    Nenhum setor adicionado. Clique em "Adicionar Setor" para começar.
                  </p>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 justify-end bg-white rounded-xl border border-gray-200 p-6">
                <button
                  onClick={() => {
                    setShowNovaFicha(false);
                    setFichaEditando(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarFicha}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Save className="w-4 h-4" />
                  Salvar Ficha
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
