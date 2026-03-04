import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Edit2,
  Map,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  Users,
  Building2,
  Workflow,
  Calendar,
  BarChart3,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { ProcessoMapeamento } from './MapaProcessos';
import { formatarDataHoje } from '../utils/formatters';
import { getFromStorage } from '../utils/helpers';

const STORAGE_KEY = 'sisteq-processos-mapeamento';

export default function MapaProcessoVisualizar() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [processo, setProcesso] = useState<ProcessoMapeamento | null>(null);

  useEffect(() => {
    carregarProcesso();
  }, [id]);

  const carregarProcesso = () => {
    try {
      const processos = getFromStorage<ProcessoMapeamento[]>(STORAGE_KEY, []);
      const processoEncontrado = processos.find(p => p.id === id);
      if (processoEncontrado) {
        setProcesso(processoEncontrado);
      } else {
        toast.error('Processo não encontrado');
        navigate('/processos/mapa');
      }
    } catch (error) {
      console.error('Erro ao carregar processo:', error);
      toast.error('Erro ao carregar processo');
      navigate('/processos/mapa');
    }
  };

  const handleEditar = () => {
    navigate('/processos/mapa', { state: { editingId: id } });
  };

  const handleVoltar = () => {
    navigate('/processos/mapa');
  };

  if (!processo) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando processo...</p>
        </div>
      </div>
    );
  }

  const atividadesPreenchidas = processo.atividades.filter(a => a.trim() !== '');
  const totalAtividades = atividadesPreenchidas.length;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header com Botão Voltar */}
      <Button
        variant="ghost"
        onClick={handleVoltar}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Mapas
      </Button>

      {/* Cabeçalho do Processo */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-8">
          {/* Título e Código */}
          <div className="mb-6">
            <div className="flex items-start gap-4 mb-2">
              <div className="flex-shrink-0 w-14 h-14 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-center">
                <Map className="w-7 h-7 text-indigo-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 mb-2">
                  {processo.codigoMP ? (
                    <>
                      <h1 className="text-3xl text-gray-900 tracking-tight" style={{ fontWeight: 700 }}>
                        {processo.codigoMP}
                      </h1>
                      <span className="text-xl text-gray-300">—</span>
                    </>
                  ) : (
                    <span className="text-base text-gray-500" style={{ fontWeight: 500 }}>
                      Processo #{processo.numero}
                    </span>
                  )}
                  <h2 className="text-3xl text-gray-700" style={{ fontWeight: 600 }}>
                    {processo.setor}
                  </h2>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de metadados */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
            {/* Código/Número */}
            <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>
                {processo.codigoMP ? 'Código' : 'Número'}
              </p>
              <p className="text-sm font-mono text-gray-900" style={{ fontWeight: 600 }}>
                {processo.codigoMP || `#${processo.numero}`}
              </p>
            </div>

            {/* Setor/Processo */}
            <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Setor</p>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>{processo.setor}</p>
              </div>
            </div>

            {/* Total de Atividades */}
            <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Atividades</p>
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <p className="text-sm text-blue-600" style={{ fontWeight: 600 }}>{totalAtividades}</p>
              </div>
            </div>

            {/* Status do Mapa */}
            <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Status</p>
              {processo.mapaGerado ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <p className="text-sm font-medium text-green-700">Gerado</p>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                  <p className="text-sm font-medium text-orange-700">Pendente</p>
                </div>
              )}
            </div>
          </div>

          {/* Badge de Status - Destacado */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500" style={{ fontWeight: 500 }}>Mapa:</span>
              {processo.mapaGerado ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border-green-200 border shadow-sm">
                  <CheckCircle2 className="w-5 h-5 text-green-700" />
                  <span className="text-base text-green-700" style={{ fontWeight: 600 }}>Mapa Gerado</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-50 border-orange-200 border shadow-sm">
                  <AlertCircle className="w-5 h-5 text-orange-700" />
                  <span className="text-base text-orange-700" style={{ fontWeight: 600 }}>Aguardando Geração</span>
                </div>
              )}
            </div>
          </div>

          {/* Botão de Editar no canto superior direito */}
          {!processo.mapaGerado && (
            <div className="absolute top-4 right-4">
              <Button
                size="sm"
                variant="outline"
                className="bg-white/80 backdrop-blur-sm gap-1.5"
                onClick={handleEditar}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Editar
              </Button>
            </div>
          )}
        </div>

        {/* Linha de gradiente decorativa no bottom */}
        <div className={`h-1 w-full ${processo.mapaGerado ? 'bg-green-500' : 'bg-orange-500'}`}></div>
      </div>

      {/* Fluxo de Atividades - Visual de Alto Nível */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Workflow className="w-6 h-6 text-indigo-600" />
          <h3 className="text-gray-900" style={{ fontSize: '1.25rem', fontWeight: 600 }}>Fluxo de Atividades</h3>
        </div>

        {totalAtividades === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">Nenhuma atividade cadastrada</p>
              <p className="text-sm text-gray-400 mt-1">Adicione atividades ao processo para visualizar o fluxo</p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Linha conectora */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-300 via-purple-300 to-pink-300"></div>

            <div className="space-y-4">
              {atividadesPreenchidas.map((atividade, index) => (
                <div key={index} className="relative">
                  {/* Ponto de conexão */}
                  <div className="absolute left-6 top-6 w-5 h-5 bg-white border-4 border-indigo-500 rounded-full z-10 shadow-lg"></div>

                  {/* Card da Atividade */}
                  <div className="ml-16 group">
                    <Card className="hover:shadow-lg transition-all duration-300 border-gray-200 hover:border-indigo-300 bg-white">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Número da etapa */}
                          <div className="flex-shrink-0 w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="text-lg text-white" style={{ fontWeight: 600 }}>
                              {index + 1}
                            </span>
                          </div>

                          {/* Conteúdo da atividade */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <h4 className="text-lg text-gray-900 group-hover:text-indigo-700 transition-colors" style={{ fontWeight: 600 }}>
                                {atividade}
                              </h4>
                              <Badge variant="outline" className="flex-shrink-0">
                                Etapa {index + 1}
                              </Badge>
                            </div>
                            
                            {/* Informações adicionais (placeholder) */}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                <span>Responsável não definido</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                <span>Tempo não estimado</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Seta conectora (exceto no último) */}
                  {index < atividadesPreenchidas.length - 1 && (
                    <div className="absolute left-7 top-full w-0.5 h-4 bg-gradient-to-b from-indigo-400 to-purple-400 z-0"></div>
                  )}
                </div>
              ))}
            </div>

            {/* Ponto final */}
            <div className="relative mt-4">
              <div className="absolute left-6 top-0 w-5 h-5 bg-green-600 rounded-full z-10 shadow-sm border-2 border-white"></div>
              <div className="ml-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-700">Processo Concluído</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cards de Informações Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Estatísticas */}
        <Card className="border-gray-200 bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <h4 className="text-gray-900" style={{ fontWeight: 600 }}>Estatísticas</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total de Etapas</span>
                <span className="text-gray-900" style={{ fontWeight: 700 }}>{totalAtividades}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Complexidade</span>
                <Badge variant="outline">
                  {totalAtividades <= 3 ? 'Baixa' : totalAtividades <= 6 ? 'Média' : 'Alta'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status</span>
                {processo.mapaGerado ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">Mapeado</Badge>
                ) : (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">Rascunho</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Departamento */}
        <Card className="border-gray-200 bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <h4 className="text-gray-900" style={{ fontWeight: 600 }}>Departamento</h4>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Setor Responsável</p>
                <p className="text-gray-900" style={{ fontWeight: 600 }}>{processo.setor}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Tipo de Processo</p>
                <Badge variant="outline">Operacional</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documentação */}
        <Card className="border-gray-200 bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <h4 className="text-gray-900" style={{ fontWeight: 600 }}>Documentação</h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Layers className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Versão: 1.0</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  Criado: {formatarDataHoje()}
                </span>
              </div>
              {processo.mapaGerado && processo.codigoMP && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-xs text-green-600" style={{ fontWeight: 600 }}>
                    ✓ Mapa {processo.codigoMP} Gerado
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botões de Ação Inferiores */}
      {!processo.mapaGerado && (
        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleEditar}
            className="gap-2"
            size="lg"
          >
            <Edit2 className="w-5 h-5" />
            Editar Processo
          </Button>
        </div>
      )}
    </div>
  );
}