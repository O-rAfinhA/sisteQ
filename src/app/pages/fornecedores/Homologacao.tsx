import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  CheckCircle2,
  Settings,
  Upload,
  FileText,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
  Shield,
  FileCheck,
  CalendarClock,
  Paperclip,
  Trash2,
  AlertCircle,
  MessageSquareWarning
} from 'lucide-react';
import { useFornecedores } from '../../hooks/useFornecedores';
import { NivelAvaliacao } from '../../types/fornecedor';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

// Helper: dias até vencimento
function diasAteVencimento(dataValidade: string | undefined): number | null {
  if (!dataValidade) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade);
  validade.setHours(0, 0, 0, 0);
  return Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

// Helper: status badge da validade
function ValidadeBadge({ dataValidade }: { dataValidade: string | undefined }) {
  const dias = diasAteVencimento(dataValidade);
  if (dias === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-500 border border-gray-200">
        <Calendar className="w-3 h-3" />
        Sem validade
      </span>
    );
  }
  if (dias < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-red-100 text-red-700 border border-red-200" style={{ fontWeight: 500 }}>
        <AlertTriangle className="w-3 h-3" />
        Vencido há {Math.abs(dias)} dia(s)
      </span>
    );
  }
  if (dias <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-amber-100 text-amber-700 border border-amber-200" style={{ fontWeight: 500 }}>
        <Clock className="w-3 h-3" />
        Vence em {dias} dia(s)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-emerald-100 text-emerald-700 border border-emerald-200" style={{ fontWeight: 500 }}>
      <CheckCircle className="w-3 h-3" />
      Válido ({dias} dias)
    </span>
  );
}

export function FornecedorHomologacao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getFornecedorById, updateFornecedor, configuracao } = useFornecedores();
  const [etapa, setEtapa] = useState(1);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [mostrarResumoCriterios, setMostrarResumoCriterios] = useState(false);

  const fornecedor = id ? getFornecedorById(id) : null;

  // Inicializar análise documental baseada nos tipos do fornecedor
  const getDocumentosIniciais = () => {
    if (!fornecedor || !configuracao || !configuracao.documentosPorTipo) return {};

    const documentos: {
      [key: string]: {
        status: 'Aplicável' | 'Não Aplicável';
        conforme: boolean;
        nomeArquivo?: string;
        dataUpload?: string;
        dataValidade?: string;
        observacao?: string;
      };
    } = {};

    fornecedor.tipo.forEach(tipo => {
      const docsDoTipo = configuracao.documentosPorTipo[tipo] || [];
      docsDoTipo.forEach(doc => {
        if (!documentos[doc]) {
          documentos[doc] = { status: 'Aplicável', conforme: false };
        }
      });
    });

    return documentos;
  };

  const [analiseDocumental, setAnaliseDocumental] = useState<{
    [key: string]: {
      status: 'Aplicável' | 'Não Aplicável';
      conforme: boolean;
      nomeArquivo?: string;
      dataUpload?: string;
      dataValidade?: string;
      observacao?: string;
    };
  }>(getDocumentosIniciais());

  const [criterios, setCriterios] = useState<{
    capacidadeProdutiva: NivelAvaliacao | null;
    reconhecimentoMercado: NivelAvaliacao | null;
    amostraProduto: NivelAvaliacao | null;
    avaliacaoPrimeiroServico: NivelAvaliacao | null;
    prazoEntrega: NivelAvaliacao | null;
  }>({
    capacidadeProdutiva: null,
    reconhecimentoMercado: null,
    amostraProduto: null,
    avaliacaoPrimeiroServico: null,
    prazoEntrega: null
  });

  const [decisao, setDecisao] = useState({
    resultado: 'Homologado' as 'Homologado' | 'Homologado com Restrição' | 'Reprovado',
    responsavel: '',
    observacao: ''
  });

  // Observações por critério (obrigatório para Parcialmente Adequado / Inadequado)
  const [observacoesCriterios, setObservacoesCriterios] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (fornecedor?.homologacao) {
      setAnaliseDocumental(fornecedor.homologacao.analiseDocumental);
      setCriterios(fornecedor.homologacao.criterios);
      if (fornecedor.homologacao.observacoesCriterios) {
        setObservacoesCriterios({ ...fornecedor.homologacao.observacoesCriterios });
      }
      if (fornecedor.homologacao.decisao) {
        setDecisao({
          resultado: fornecedor.homologacao.decisao.resultado,
          responsavel: fornecedor.homologacao.decisao.responsavel,
          observacao: fornecedor.homologacao.decisao.observacao
        });
      }
    } else {
      setAnaliseDocumental(getDocumentosIniciais());
    }
  }, [fornecedor, configuracao]);

  // Cálculos
  const docsAplicaveis = useMemo(() =>
    Object.entries(analiseDocumental).filter(([, d]) => d.status === 'Aplicável'),
    [analiseDocumental]
  );
  const docsConformes = docsAplicaveis.filter(([, d]) => d.conforme).length;
  const docsComArquivo = docsAplicaveis.filter(([, d]) => d.nomeArquivo).length;
  const docsVencidos = docsAplicaveis.filter(([, d]) => {
    const dias = diasAteVencimento(d.dataValidade);
    return dias !== null && dias < 0;
  }).length;
  const docsAVencer = docsAplicaveis.filter(([, d]) => {
    const dias = diasAteVencimento(d.dataValidade);
    return dias !== null && dias >= 0 && dias <= 30;
  }).length;

  if (!fornecedor) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Fornecedor não encontrado</p>
      </div>
    );
  }

  const totalDocumental = Object.keys(analiseDocumental).length;

  // Simular upload de arquivo
  const handleUpload = (documento: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setAnaliseDocumental(prev => ({
          ...prev,
          [documento]: {
            ...prev[documento],
            nomeArquivo: file.name,
            dataUpload: new Date().toISOString(),
            conforme: true
          }
        }));
        toast.success(`Arquivo "${file.name}" anexado com sucesso`);
      }
    };
    input.click();
  };

  const handleRemoverArquivo = (documento: string) => {
    setAnaliseDocumental(prev => ({
      ...prev,
      [documento]: {
        ...prev[documento],
        nomeArquivo: undefined,
        dataUpload: undefined,
        conforme: false
      }
    }));
    toast.success('Arquivo removido');
  };

  const handleSalvarEtapa1 = () => {
    if (!id) return;

    updateFornecedor(id, {
      homologacao: {
        ...fornecedor.homologacao,
        status: 'Em Análise',
        dataInicio: fornecedor.homologacao?.dataInicio || new Date().toISOString(),
        analiseDocumental,
        criterios: fornecedor.homologacao?.criterios || {
          capacidadeProdutiva: null,
          reconhecimentoMercado: null,
          amostraProduto: null,
          avaliacaoPrimeiroServico: null,
          prazoEntrega: null
        }
      }
    });

    toast.success('Análise documental salva');
    setEtapa(2);
  };

  const handleSalvarEtapa2 = () => {
    if (!id) return;

    const todosPreenchidos = Object.values(criterios).every(c => c !== null);
    if (!todosPreenchidos) {
      toast.error('Preencha todos os critérios');
      return;
    }

    // Validar observações obrigatórias para Parcialmente Adequado / Inadequado
    const criteriosComObsObrigatoria = Object.entries(criterios).filter(
      ([, nivel]) => nivel === 'Parcialmente Adequado' || nivel === 'Inadequado'
    );
    for (const [key] of criteriosComObsObrigatoria) {
      if (!observacoesCriterios[key]?.trim()) {
        toast.error(`Preencha a observação para "${criterioLabels[key]}" (${criterios[key as keyof typeof criterios]})`);
        return;
      }
    }

    updateFornecedor(id, {
      homologacao: {
        ...fornecedor.homologacao!,
        criterios,
        observacoesCriterios
      }
    });

    toast.success('Critérios salvos');
    setEtapa(3);
  };

  const handleFinalizar = () => {
    if (!id) return;

    if (!decisao.responsavel || !decisao.observacao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Calcular status objetivo para persistir junto com a decisão
    const criteriosValues = Object.values(criterios);
    const preenchidos = criteriosValues.filter(c => c !== null).length;
    const adequados = criteriosValues.filter(c => c === 'Adequado').length;
    const inadequados = criteriosValues.filter(c => c === 'Inadequado').length;
    const docsOk = docsAplicaveis.length === 0 || (docsConformes === docsAplicaveis.length && docsVencidos === 0);
    const statusCalculado =
      preenchidos < 5 ? 'Pendente'
        : inadequados > 0 ? 'Reprovado'
          : adequados === 5 && docsOk ? 'Homologado'
            : 'Homologado com Restrição';

    const novoStatus = decisao.resultado === 'Reprovado' ? 'Bloqueado' :
      decisao.resultado === 'Homologado com Restrição' ? 'Homologado com Restrição' : 'Homologado';

    updateFornecedor(id, {
      status: novoStatus,
      homologacao: {
        ...fornecedor.homologacao!,
        observacoesCriterios,
        status: decisao.resultado as any,
        statusCalculado,
        dataConclusao: new Date().toISOString(),
        decisao: {
          ...decisao,
          data: new Date().toISOString()
        }
      }
    });

    toast.success(`Fornecedor ${decisao.resultado.toLowerCase()}`);
    navigate('/fornecedores/homologacao');
  };

  const criterioLabels: Record<string, string> = {
    capacidadeProdutiva: 'Capacidade Produtiva',
    reconhecimentoMercado: 'Reconhecimento de Mercado',
    amostraProduto: 'Amostra do Produto',
    avaliacaoPrimeiroServico: 'Avaliação do Primeiro Serviço',
    prazoEntrega: 'Prazo de Entrega Prometido'
  };

  const getNivelColor = (nivel: NivelAvaliacao | null) => {
    if (!nivel) return 'bg-gray-50 text-gray-400 border-gray-200';
    if (nivel === 'Adequado') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (nivel === 'Parcialmente Adequado') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const getNivelIcon = (nivel: NivelAvaliacao | null) => {
    if (!nivel) return <Clock className="w-4 h-4" />;
    if (nivel === 'Adequado') return <CheckCircle className="w-4 h-4" />;
    if (nivel === 'Parcialmente Adequado') return <AlertTriangle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/fornecedores/homologacao')}
            className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
              Homologação de Fornecedor
            </h1>
            <p className="text-gray-500 mt-0.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
              {fornecedor.razaoSocial}
              <span className="mx-2 text-gray-300">|</span>
              <span className="text-gray-400 font-mono text-xs">{fornecedor.cnpj}</span>
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => navigate(`/fornecedores/visualizar/${fornecedor.id}`)}
        >
          <Eye className="w-4 h-4" />
          Visualizar Completo
        </Button>
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-8">
          {['Análise Documental', 'Critérios', 'Decisão'].map((label, idx) => {
            const step = idx + 1;
            const isActive = etapa === step;
            const isCompleted = etapa > step;

            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <Button
                    variant={isCompleted ? 'default' : isActive ? 'black' : 'secondary'}
                    size="icon"
                    onClick={() => { if (isCompleted) setEtapa(step); }}
                    className="w-10 h-10 rounded-full text-sm"
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step}
                  </Button>
                  <span
                    className={`mt-2 text-xs ${isActive ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    style={{ fontWeight: isActive ? 600 : 400 }}
                  >
                    {label}
                  </span>
                </div>
                {idx < 2 && (
                  <div
                    className={`h-0.5 flex-1 mx-4 rounded ${etapa > step ? 'bg-emerald-500' : 'bg-gray-200'
                      }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ══════ Etapa 1 - Análise Documental (MELHORADA) ══════ */}
        {etapa === 1 && (
          <div className="space-y-5">
            {/* Cards de métricas */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-blue-600" style={{ fontWeight: 500 }}>Documentos</span>
                </div>
                <p className="text-blue-900" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                  {docsAplicaveis.length}
                  <span className="text-xs text-blue-400 ml-1">/ {totalDocumental}</span>
                </p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <div className="flex items-center gap-2 mb-1">
                  <FileCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-emerald-600" style={{ fontWeight: 500 }}>Conformes</span>
                </div>
                <p className="text-emerald-900" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                  {docsConformes}
                  <span className="text-xs text-emerald-400 ml-1">/ {docsAplicaveis.length}</span>
                </p>
              </div>
              <div className={`rounded-xl p-4 border ${docsVencidos > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`w-4 h-4 ${docsVencidos > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className={`text-xs ${docsVencidos > 0 ? 'text-red-600' : 'text-gray-500'}`} style={{ fontWeight: 500 }}>Vencidos</span>
                </div>
                <p className={docsVencidos > 0 ? 'text-red-900' : 'text-gray-600'} style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                  {docsVencidos}
                </p>
              </div>
              <div className={`rounded-xl p-4 border ${docsAVencer > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <CalendarClock className={`w-4 h-4 ${docsAVencer > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                  <span className={`text-xs ${docsAVencer > 0 ? 'text-amber-600' : 'text-gray-500'}`} style={{ fontWeight: 500 }}>A vencer (30d)</span>
                </div>
                <p className={docsAVencer > 0 ? 'text-amber-900' : 'text-gray-600'} style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                  {docsAVencer}
                </p>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Progresso Geral</h3>
                <span className={`text-sm ${
                  docsAplicaveis.length > 0 && docsConformes === docsAplicaveis.length ? 'text-emerald-600' : docsAplicaveis.length > 0 && (docsConformes / docsAplicaveis.length) >= 0.5 ? 'text-amber-600' : 'text-red-600'
                }`} style={{ fontWeight: 500 }}>
                  {docsAplicaveis.length > 0 ? Math.round((docsConformes / docsAplicaveis.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all rounded-full ${
                    docsConformes === docsAplicaveis.length && docsAplicaveis.length > 0
                      ? 'bg-emerald-500'
                      : docsAplicaveis.length > 0 && (docsConformes / docsAplicaveis.length) >= 0.5
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${docsAplicaveis.length > 0 ? (docsConformes / docsAplicaveis.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Lista de documentos */}
            {Object.keys(analiseDocumental).length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl">
                <Settings className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">Nenhum documento configurado</p>
                <p className="text-xs text-gray-400">
                  Configure documentos para este tipo de fornecedor em Configurações
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(analiseDocumental).map(([documento, dados]) => {
                  const isExpanded = expandedDoc === documento;
                  const dias = diasAteVencimento(dados.dataValidade);
                  const isVencido = dias !== null && dias < 0;
                  const isAVencer = dias !== null && dias >= 0 && dias <= 30;

                  return (
                    <div
                      key={documento}
                      className={`border rounded-xl transition-all ${isVencido
                        ? 'border-red-200 bg-red-50/30'
                        : isAVencer
                          ? 'border-amber-200 bg-amber-50/20'
                          : dados.conforme
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      {/* Cabeçalho do documento */}
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer"
                        onClick={() => setExpandedDoc(isExpanded ? null : documento)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {/* Indicador de status */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${dados.status === 'Não Aplicável'
                            ? 'bg-gray-100'
                            : dados.conforme
                              ? isVencido ? 'bg-red-100' : 'bg-emerald-100'
                              : 'bg-gray-100'
                            }`}>
                            {dados.status === 'Não Aplicável' ? (
                              <XCircle className="w-4 h-4 text-gray-400" />
                            ) : dados.conforme ? (
                              isVencido ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <FileText className="w-4 h-4 text-gray-400" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>
                                {documento}
                              </span>
                              {dados.nomeArquivo && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600 border border-blue-100">
                                  <Paperclip className="w-2.5 h-2.5" />
                                  Anexo
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {dados.status === 'Aplicável' && (
                                <ValidadeBadge dataValidade={dados.dataValidade} />
                              )}
                              {dados.status === 'Não Aplicável' && (
                                <span className="text-xs text-gray-400">Não aplicável</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Toggle Aplicável/NA compacto */}
                          <div className="flex gap-1 mr-2">
                            <Button
                              variant={dados.status === 'Aplicável' ? 'black' : 'secondary'}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAnaliseDocumental(prev => ({
                                  ...prev,
                                  [documento]: { ...prev[documento], status: 'Aplicável' }
                                }));
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              Aplicável
                            </Button>
                            <Button
                              variant={dados.status === 'Não Aplicável' ? 'black' : 'secondary'}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAnaliseDocumental(prev => ({
                                  ...prev,
                                  [documento]: { ...prev[documento], status: 'Não Aplicável', conforme: false, nomeArquivo: undefined, dataUpload: undefined, dataValidade: undefined }
                                }));
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              N/A
                            </Button>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>

                      {/* Conteúdo expandido */}
                      {isExpanded && dados.status === 'Aplicável' && (
                        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                          <div className="grid grid-cols-2 gap-3">
                            {/* Upload de documento */}
                            <div>
                              <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 500 }}>
                                Documento Anexo
                              </label>
                              {dados.nomeArquivo ? (
                                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                  <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-blue-800 truncate" style={{ fontWeight: 500 }}>{dados.nomeArquivo}</p>
                                    {dados.dataUpload && (
                                      <p className="text-xs text-blue-500">
                                        Enviado em {new Date(dados.dataUpload).toLocaleDateString('pt-BR')}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoverArquivo(documento)}
                                    className="h-7 w-7 text-blue-600"
                                    title="Remover arquivo"
                                    aria-label="Remover arquivo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-blue-500" />
                                  </Button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleUpload(documento)}
                                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-accent transition-all text-sm text-gray-500 hover:text-blue-600"
                                >
                                  <Upload className="w-4 h-4" />
                                  Enviar documento
                                </button>
                              )}
                            </div>

                            {/* Data de validade */}
                            <div>
                              <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 500 }}>
                                Data de Validade
                              </label>
                              <input
                                type="date"
                                value={dados.dataValidade || ''}
                                onChange={(e) =>
                                  setAnaliseDocumental(prev => ({
                                    ...prev,
                                    [documento]: { ...prev[documento], dataValidade: e.target.value }
                                  }))
                                }
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm transition-colors"
                              />
                              {dados.dataValidade && (
                                <div className="mt-1.5">
                                  <ValidadeBadge dataValidade={dados.dataValidade} />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Observação */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 500 }}>
                              Observação
                            </label>
                            <input
                              type="text"
                              value={dados.observacao || ''}
                              onChange={(e) =>
                                setAnaliseDocumental(prev => ({
                                  ...prev,
                                  [documento]: { ...prev[documento], observacao: e.target.value }
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm transition-colors"
                              placeholder="Observações sobre este documento..."
                            />
                          </div>

                          {/* Conformidade */}
                          <label
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${dados.conforme
                              ? 'bg-emerald-50 border border-emerald-200'
                              : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={dados.conforme}
                              onChange={() =>
                                setAnaliseDocumental(prev => ({
                                  ...prev,
                                  [documento]: { ...prev[documento], conforme: !prev[documento].conforme }
                                }))
                              }
                              className="w-4 h-4 text-emerald-600 rounded border-gray-300"
                            />
                            <span className={`text-sm ${dados.conforme ? 'text-emerald-700' : 'text-gray-600'}`} style={{ fontWeight: 500 }}>
                              {dados.conforme ? 'Documento conforme' : 'Marcar como conforme'}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <Button onClick={handleSalvarEtapa1} className="w-full">
              Salvar e Próxima Etapa
            </Button>
          </div>
        )}

        {/* ══════ Etapa 2 - Critérios (MELHORADA) ══════ */}
        {etapa === 2 && (
          <div className="space-y-5">
            {/* Consulta rápida resumo */}
            <button
              onClick={() => setMostrarResumoCriterios(!mostrarResumoCriterios)}
              className="w-full flex items-center justify-between p-4 bg-accent rounded-xl border border-border hover:bg-accent/80 transition-all"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground" style={{ fontWeight: 500 }}>
                  Consulta Rápida — Resumo dos Critérios
                </span>
              </div>
              {mostrarResumoCriterios ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {mostrarResumoCriterios && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <div className="grid grid-cols-5 gap-3">
                  {Object.entries(criterios).map(([key, value]) => (
                    <div
                      key={key}
                      className={`rounded-lg p-3 border text-center ${getNivelColor(value)}`}
                    >
                      <div className="flex justify-center mb-1">
                        {getNivelIcon(value)}
                      </div>
                      <p className="text-xs mb-0.5" style={{ fontWeight: 600 }}>{value || 'Pendente'}</p>
                      <p className="text-xs opacity-70">{criterioLabels[key]}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {Object.values(criterios).filter(c => c !== null).length} de {Object.keys(criterios).length} preenchidos
                  </span>
                  <span className="text-gray-200 mx-1">|</span>
                  {Object.values(criterios).filter(c => c === 'Adequado').length > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200" style={{ fontWeight: 600 }}>
                      {Object.values(criterios).filter(c => c === 'Adequado').length} Adequado(s)
                    </span>
                  )}
                  {Object.values(criterios).filter(c => c === 'Parcialmente Adequado').length > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-600 border border-amber-200" style={{ fontWeight: 600 }}>
                      {Object.values(criterios).filter(c => c === 'Parcialmente Adequado').length} Parcial(is)
                    </span>
                  )}
                  {Object.values(criterios).filter(c => c === 'Inadequado').length > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-red-50 text-red-600 border border-red-200" style={{ fontWeight: 600 }}>
                      {Object.values(criterios).filter(c => c === 'Inadequado').length} Inadequado(s)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Critérios com visual melhorado */}
            {Object.entries(criterios).map(([key, value]) => {
              const precisaObs = value === 'Parcialmente Adequado' || value === 'Inadequado';
              return (
                <div key={key} className={`border rounded-xl p-5 transition-colors ${precisaObs && !observacoesCriterios[key]?.trim() ? 'border-amber-300 bg-amber-50/20' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getNivelColor(value)}`}>
                        {getNivelIcon(value)}
                      </div>
                      <div>
                        <h4 className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{criterioLabels[key]}</h4>
                        <p className="text-xs text-gray-400">{value || 'Selecione uma avaliação'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {(['Inadequado', 'Parcialmente Adequado', 'Adequado'] as NivelAvaliacao[]).map(nivel => (
                      <button
                        key={nivel}
                        onClick={() => {
                          setCriterios(prev => ({ ...prev, [key]: nivel }));
                          if (nivel === 'Adequado') {
                            setObservacoesCriterios(prev => {
                              const copy = { ...prev };
                              delete copy[key];
                              return copy;
                            });
                          }
                        }}
                        className={`px-4 py-3 rounded-xl text-sm transition-all border ${value === nivel
                          ? nivel === 'Adequado'
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                            : nivel === 'Parcialmente Adequado'
                              ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                              : 'bg-red-500 text-white border-red-600 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        style={{ fontWeight: 500 }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {nivel === 'Adequado' && <CheckCircle className="w-4 h-4" />}
                          {nivel === 'Parcialmente Adequado' && <AlertTriangle className="w-4 h-4" />}
                          {nivel === 'Inadequado' && <XCircle className="w-4 h-4" />}
                          {nivel}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Observação obrigatória para Parcialmente Adequado / Inadequado */}
                  {precisaObs && (
                    <div className="mt-4">
                      <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ fontWeight: 500 }}>
                        <AlertCircle className={`w-3.5 h-3.5 ${!observacoesCriterios[key]?.trim() ? 'text-amber-500' : 'text-gray-400'}`} />
                        <span className={!observacoesCriterios[key]?.trim() ? 'text-amber-700' : 'text-gray-500'}>
                          Observação {!observacoesCriterios[key]?.trim() ? '(obrigatória)' : ''}
                        </span>
                      </label>
                      <textarea
                        value={observacoesCriterios[key] || ''}
                        onChange={e => setObservacoesCriterios(prev => ({ ...prev, [key]: e.target.value }))}
                        className={`w-full px-3 py-2.5 border rounded-lg focus:ring-1 focus:outline-none text-sm transition-colors resize-none ${
                          !observacoesCriterios[key]?.trim()
                            ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/50'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        placeholder={`Justifique a classificação "${value}" para ${criterioLabels[key]}...`}
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setEtapa(1)} variant="outline" className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleSalvarEtapa2} className="flex-1">
                Próxima Etapa
              </Button>
            </div>
          </div>
        )}

        {/* ══════ Etapa 3 - Decisão ══════ */}
        {etapa === 3 && (
          <div className="space-y-5">
            {/* Resumo documental e critérios lado a lado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="text-xs text-gray-500 mb-3" style={{ fontWeight: 600 }}>RESUMO DOCUMENTAL</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Conformes</span>
                    <span className={`text-sm ${
                      docsAplicaveis.length > 0 && docsConformes === docsAplicaveis.length ? 'text-emerald-600' : docsConformes > 0 ? 'text-amber-600' : 'text-red-600'
                    }`} style={{ fontWeight: 600 }}>{docsConformes} / {docsAplicaveis.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Com anexo</span>
                    <span className="text-sm text-blue-600" style={{ fontWeight: 600 }}>{docsComArquivo}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Vencidos</span>
                    <span className={`text-sm ${docsVencidos > 0 ? 'text-red-600' : 'text-gray-400'}`} style={{ fontWeight: 600 }}>{docsVencidos}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="text-xs text-gray-500 mb-3" style={{ fontWeight: 600 }}>RESUMO CRITÉRIOS</h4>
                <div className="space-y-2">
                  {Object.entries(criterios).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 truncate mr-2">{criterioLabels[key]}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${getNivelColor(value)}`} style={{ fontWeight: 500 }}>
                        {value || 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Observações por critério (revisão antes de finalizar) */}
            {(() => {
              const criteriosComObs = Object.entries(criterios).filter(
                ([key, nivel]) => 
                  (nivel === 'Parcialmente Adequado' || nivel === 'Inadequado') && 
                  observacoesCriterios[key]?.trim()
              );
              if (criteriosComObs.length === 0) return null;
              return (
                <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquareWarning className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs text-amber-700" style={{ fontWeight: 600 }}>
                      OBSERVAÇÕES DOS CRITÉRIOS
                    </h4>
                    <span className="text-xs text-amber-500">
                      {criteriosComObs.length} critério(s) com ressalva
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {criteriosComObs.map(([key, nivel]) => (
                      <div key={key} className="bg-white rounded-lg p-3 border border-amber-100">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${getNivelColor(nivel)}`} style={{ fontWeight: 500 }}>
                            {getNivelIcon(nivel)}
                            {nivel}
                          </span>
                          <span className="text-xs text-gray-600" style={{ fontWeight: 500 }}>
                            {criterioLabels[key]}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 pl-1" style={{ lineHeight: 1.5 }}>
                          {observacoesCriterios[key]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ═══ STATUS CALCULADO PELO SISTEMA ═══ */}
            {(() => {
              const criteriosValues = Object.values(criterios);
              const preenchidos = criteriosValues.filter(c => c !== null).length;
              const adequados = criteriosValues.filter(c => c === 'Adequado').length;
              const inadequados = criteriosValues.filter(c => c === 'Inadequado').length;
              const docsOk = docsAplicaveis.length === 0 || (docsConformes === docsAplicaveis.length && docsVencidos === 0);

              const statusCalc =
                preenchidos < 5
                  ? 'Pendente'
                  : inadequados > 0
                    ? 'Reprovado'
                    : adequados === 5 && docsOk
                      ? 'Homologado'
                      : 'Homologado com Restrição';

              const configCalc: Record<string, { bg: string; text: string; border: string; icon: React.ElementType; desc: string }> = {
                'Homologado': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle, desc: '5/5 critérios Adequados, documentos 100% conformes e sem vencidos.' },
                'Homologado com Restrição': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle, desc: 'Todos os critérios avaliados, nenhum Inadequado, mas há parciais ou documentos pendentes/vencidos.' },
                'Reprovado': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle, desc: 'Ao menos um critério foi avaliado como Inadequado.' },
                'Pendente': { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', icon: Clock, desc: 'Nem todos os critérios foram avaliados.' },
              };
              const cfg = configCalc[statusCalc];
              const CalcStatusIcon = cfg.icon;

              return (
                <div className={`rounded-xl p-4 border-2 ${cfg.border} ${cfg.bg}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
                      <CalcStatusIcon className={`w-5 h-5 ${cfg.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs text-gray-500" style={{ fontWeight: 500 }}>STATUS CALCULADO PELO SISTEMA</p>
                      </div>
                      <p className={`text-sm ${cfg.text}`} style={{ fontWeight: 700 }}>{statusCalc}</p>
                      <p className="text-xs text-gray-500 mt-1" style={{ lineHeight: 1.5 }}>{cfg.desc}</p>
                      {statusCalc !== decisao.resultado && decisao.resultado && (
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1" style={{ fontWeight: 500 }}>
                          <Info className="w-3.5 h-3.5" />
                          Sua decisão ({decisao.resultado}) difere do cálculo. Justifique na observação abaixo.
                        </p>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontWeight: 700 }}>
                      <CalcStatusIcon className="w-4 h-4" />
                      {statusCalc}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-3 gap-3">
              {(['Homologado', 'Homologado com Restrição', 'Reprovado'] as const).map(resultado => (
                <button
                  key={resultado}
                  onClick={() => setDecisao(prev => ({ ...prev, resultado }))}
                  className={`px-5 py-3.5 rounded-xl text-sm transition-all border ${decisao.resultado === resultado
                    ? resultado === 'Homologado'
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : resultado === 'Homologado com Restrição'
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-red-500 text-white border-red-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  style={{ fontWeight: 500 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    {resultado === 'Homologado' && <CheckCircle className="w-4 h-4" />}
                    {resultado === 'Homologado com Restrição' && <AlertTriangle className="w-4 h-4" />}
                    {resultado === 'Reprovado' && <XCircle className="w-4 h-4" />}
                    {resultado}
                  </div>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                Responsável <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={decisao.responsavel}
                onChange={e => setDecisao(prev => ({ ...prev, responsavel: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm transition-colors"
                placeholder="Nome do responsável"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                Observação <span className="text-red-500">*</span>
              </label>
              <textarea
                value={decisao.observacao}
                onChange={e => setDecisao(prev => ({ ...prev, observacao: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none h-28 text-sm transition-colors"
                placeholder="Descreva os motivos da decisão..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setEtapa(2)} variant="outline" className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={handleFinalizar}
                variant={decisao.resultado === 'Homologado' ? 'default' : decisao.resultado === 'Homologado com Restrição' ? 'outline' : 'destructive'}
                className="flex-1 gap-2"
              >
                <Shield className="w-4 h-4" />
                Finalizar Homologação
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
