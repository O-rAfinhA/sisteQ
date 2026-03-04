import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { 
  ArrowLeft, 
  Edit3, 
  X, 
  Trash2,
  FileText,
  TrendingUp,
  ShieldAlert,
  ClipboardList,
  History,
  Target,
  Users,
  Server,
  Plus,
  Check
} from 'lucide-react';
import { useStrategic } from '../context/StrategicContext';
import { Processo, AtividadeProcesso, Risco } from '../types/strategic';
import { generateId, getFromStorage } from '../utils/helpers';
import { Indicador } from '../types/kpi';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { FuncaoCombobox } from '../components/FuncaoCombobox';
import { toast } from 'sonner';
import { useEffect } from 'react';

interface Funcao {
  id: string;
  nome: string;
  nivel: string;
  departamento: string;
  ativo: boolean;
  dataCadastro: string;
}

type DrawerContent = 'indicadores' | 'riscos' | 'documentos' | 'registros' | null;

export default function ProcessoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dados, updateProcesso, deleteProcesso } = useStrategic();
  const [drawerContent, setDrawerContent] = useState<DrawerContent>(null);
  
  // Funções cadastradas no sistema
  const [funcoesCadastradas, setFuncoesCadastradas] = useState<Funcao[]>([]);
  
  // Dados vinculados carregados dos módulos
  const [indicadoresVinculados, setIndicadoresVinculados] = useState<Indicador[]>([]);
  const [riscosVinculados, setRiscosVinculados] = useState<Risco[]>([]);
  
  // Estados de edição individuais
  const [editingHeader, setEditingHeader] = useState(false);
  const [editingObjetivo, setEditingObjetivo] = useState(false);
  const [editingFuncoes, setEditingFuncoes] = useState(false);
  const [editingRecursos, setEditingRecursos] = useState(false);
  const [editingEntradas, setEditingEntradas] = useState(false);
  const [editingAtividades, setEditingAtividades] = useState(false);
  const [editingSaidas, setEditingSaidas] = useState(false);
  
  // Dados temporários durante edição
  const [tempHeader, setTempHeader] = useState<any>(null);
  const [tempObjetivo, setTempObjetivo] = useState('');
  const [tempFuncoes, setTempFuncoes] = useState<string[]>([]);
  const [tempRecursos, setTempRecursos] = useState<string[]>([]);
  const [tempEntradas, setTempEntradas] = useState<string[]>([]);
  const [tempAtividades, setTempAtividades] = useState<AtividadeProcesso[]>([]);
  const [tempSaidas, setTempSaidas] = useState<string[]>([]);

  // Carregar funções cadastradas do localStorage
  useEffect(() => {
    const funcoes = getFromStorage<Funcao[]>('funcoes', []);
    setFuncoesCadastradas(funcoes.filter(f => f.ativo));
  }, []);

  const processo = dados.processos?.find(p => p.id === id);

  if (!processo) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <h2 className="text-gray-900" style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            Processo não encontrado
          </h2>
          <p className="text-gray-600 mb-6">
            O processo que você está procurando não existe.
          </p>
          <Button onClick={() => navigate('/processos')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Processos
          </Button>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja excluir este processo? Esta ação não pode ser desfeita.')) {
      deleteProcesso(processo.id);
      toast.success('Processo excluído com sucesso!');
      navigate('/processos');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rascunho': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Arquivado': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // ===== HEADER =====
  const handleEditHeader = () => {
    setTempHeader({
      codigo: processo.codigo,
      nome: processo.nome,
      departamento: processo.departamento,
      status: processo.status
    });
    setEditingHeader(true);
  };

  const handleSaveHeader = () => {
    if (!tempHeader.codigo || !tempHeader.nome || !tempHeader.departamento) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    updateProcesso(processo.id, tempHeader);
    setEditingHeader(false);
    toast.success('Header atualizado com sucesso!');
  };

  const handleCancelHeader = () => {
    setTempHeader(null);
    setEditingHeader(false);
  };

  // ===== OBJETIVO =====
  const handleEditObjetivo = () => {
    setTempObjetivo(processo.objetivo || '');
    setEditingObjetivo(true);
  };

  const handleSaveObjetivo = () => {
    updateProcesso(processo.id, { objetivo: tempObjetivo });
    setEditingObjetivo(false);
    toast.success('Objetivo atualizado!');
  };

  const handleCancelObjetivo = () => {
    setTempObjetivo('');
    setEditingObjetivo(false);
  };

  // ===== FUNÇÕES =====
  const handleEditFuncoes = () => {
    setTempFuncoes(processo.funcoes || []);
    setEditingFuncoes(true);
  };

  const handleSaveFuncoes = () => {
    updateProcesso(processo.id, { funcoes: tempFuncoes });
    setEditingFuncoes(false);
    toast.success('Funções atualizadas!');
  };

  const handleCancelFuncoes = () => {
    setTempFuncoes([]);
    setEditingFuncoes(false);
  };

  const handleAddFuncao = () => {
    setTempFuncoes([...tempFuncoes, '']);
  };

  const handleRemoveFuncao = (index: number) => {
    setTempFuncoes(tempFuncoes.filter((_, i) => i !== index));
  };

  const handleChangeFuncao = (index: number, value: string) => {
    const newFuncoes = [...tempFuncoes];
    newFuncoes[index] = value;
    setTempFuncoes(newFuncoes);
  };

  // ===== RECURSOS =====
  const handleEditRecursos = () => {
    setTempRecursos(processo.recursos || []);
    setEditingRecursos(true);
  };

  const handleSaveRecursos = () => {
    updateProcesso(processo.id, { recursos: tempRecursos });
    setEditingRecursos(false);
    toast.success('Recursos atualizados!');
  };

  const handleCancelRecursos = () => {
    setTempRecursos([]);
    setEditingRecursos(false);
  };

  const handleAddRecurso = () => {
    setTempRecursos([...tempRecursos, '']);
  };

  const handleRemoveRecurso = (index: number) => {
    setTempRecursos(tempRecursos.filter((_, i) => i !== index));
  };

  const handleChangeRecurso = (index: number, value: string) => {
    const newRecursos = [...tempRecursos];
    newRecursos[index] = value;
    setTempRecursos(newRecursos);
  };

  // ===== ENTRADAS =====
  const handleEditEntradas = () => {
    setTempEntradas(processo.entradas || []);
    setEditingEntradas(true);
  };

  const handleSaveEntradas = () => {
    updateProcesso(processo.id, { entradas: tempEntradas });
    setEditingEntradas(false);
    toast.success('Entradas atualizadas!');
  };

  const handleCancelEntradas = () => {
    setTempEntradas([]);
    setEditingEntradas(false);
  };

  const handleAddEntrada = () => {
    setTempEntradas([...tempEntradas, '']);
  };

  const handleRemoveEntrada = (index: number) => {
    setTempEntradas(tempEntradas.filter((_, i) => i !== index));
  };

  const handleChangeEntrada = (index: number, value: string) => {
    const newEntradas = [...tempEntradas];
    newEntradas[index] = value;
    setTempEntradas(newEntradas);
  };

  // ===== ATIVIDADES =====
  const handleEditAtividades = () => {
    setTempAtividades(processo.atividades || []);
    setEditingAtividades(true);
  };

  const handleSaveAtividades = () => {
    updateProcesso(processo.id, { atividades: tempAtividades });
    setEditingAtividades(false);
    toast.success('Atividades atualizadas!');
  };

  const handleCancelAtividades = () => {
    setTempAtividades([]);
    setEditingAtividades(false);
  };

  const handleAddAtividade = () => {
    const newAtividade: AtividadeProcesso = {
      id: generateId('ativ-'),
      nome: '',
      responsavel: '',
      ordem: tempAtividades.length + 1
    };
    setTempAtividades([...tempAtividades, newAtividade]);
  };

  const handleRemoveAtividade = (index: number) => {
    setTempAtividades(tempAtividades.filter((_, i) => i !== index).map((a, i) => ({ ...a, ordem: i + 1 })));
  };

  const handleChangeAtividade = (index: number, field: keyof AtividadeProcesso, value: any) => {
    const newAtividades = [...tempAtividades];
    newAtividades[index] = { ...newAtividades[index], [field]: value };
    setTempAtividades(newAtividades);
  };

  // ===== SAÍDAS =====
  const handleEditSaidas = () => {
    setTempSaidas(processo.saidas || []);
    setEditingSaidas(true);
  };

  const handleSaveSaidas = () => {
    updateProcesso(processo.id, { saidas: tempSaidas });
    setEditingSaidas(false);
    toast.success('Saídas atualizadas!');
  };

  const handleCancelSaidas = () => {
    setTempSaidas([]);
    setEditingSaidas(false);
  };

  const handleAddSaida = () => {
    setTempSaidas([...tempSaidas, '']);
  };

  const handleRemoveSaida = (index: number) => {
    setTempSaidas(tempSaidas.filter((_, i) => i !== index));
  };

  const handleChangeSaida = (index: number, value: string) => {
    const newSaidas = [...tempSaidas];
    newSaidas[index] = value;
    setTempSaidas(newSaidas);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER FIXO */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="px-8 py-5">
          <div className="flex items-start justify-between">
            {/* Lado Esquerdo - Info do Processo */}
            <div className="flex items-start gap-4 flex-1">
              <Button
                variant="ghost"
                onClick={() => navigate('/processos')}
                className="gap-2 mt-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              
              <Separator orientation="vertical" className="h-16" />
              
              <div className="flex-1">
                {editingHeader ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Input
                        value={tempHeader.nome}
                        onChange={(e) => setTempHeader({ ...tempHeader, nome: e.target.value })}
                        className="text-xl font-bold max-w-md"
                        placeholder="Nome do Processo"
                      />
                      <Input
                        value={tempHeader.codigo}
                        onChange={(e) => setTempHeader({ ...tempHeader, codigo: e.target.value })}
                        className="font-mono text-sm w-32"
                        placeholder="Código"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        value={tempHeader.departamento}
                        onChange={(e) => setTempHeader({ ...tempHeader, departamento: e.target.value })}
                        className="text-sm max-w-xs"
                        placeholder="Departamento"
                      />
                      <Select
                        value={tempHeader.status}
                        onValueChange={(value) => setTempHeader({ ...tempHeader, status: value })}
                      >
                        <SelectTrigger className="text-sm w-32">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Rascunho">Rascunho</SelectItem>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Arquivado">Arquivado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={handleSaveHeader} className="gap-1 text-green-600 hover:text-green-700">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelHeader} className="gap-1">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
                        {processo.nome}
                      </h1>
                      <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {processo.codigo}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleEditHeader}
                        className="gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <strong>Departamento:</strong> {processo.departamento}
                      </span>
                      <span>•</span>
                      <Badge className={getStatusColor(processo.status)}>
                        {processo.status}
                      </Badge>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <strong>Versão:</strong> {processo.versaoAtual}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Lado Direito - Botões de Ação */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => toast.info('Funcionalidade em desenvolvimento')}
                className="gap-2"
              >
                <History className="w-4 h-4" />
                Histórico
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.info('Funcionalidade em desenvolvimento')}
                className="gap-2"
              >
                Publicar Versão
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CORPO PRINCIPAL - PÁGINA ÚNICA */}
      <div className="px-8 py-6 max-w-[1600px] mx-auto">
        <div className="space-y-6">
          
          {/* ZONA 1 - IDENTIDADE E ESTRUTURA */}
          <div className="space-y-4">
            {/* Objetivo do Processo */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-gray-600" />
                  <CardTitle className="text-base">Objetivo do Processo</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {editingObjetivo ? (
                    <div className="space-y-3">
                      <Textarea
                        value={tempObjetivo}
                        onChange={(e) => setTempObjetivo(e.target.value)}
                        placeholder="Descreva o objetivo deste processo..."
                        rows={3}
                        className="w-full"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveObjetivo} className="gap-1">
                          <Check className="w-3 h-3" />
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelObjetivo} className="gap-1">
                          <X className="w-3 h-3" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {processo.objetivo || 'Nenhum objetivo definido.'}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEditObjetivo}
                        className="absolute -right-2 -top-2 transition-opacity gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Funções */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  <CardTitle className="text-base">Funções</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {editingFuncoes ? (
                    <div className="space-y-3">
                      {tempFuncoes.map((funcao, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <FuncaoCombobox
                            value={funcao}
                            onChange={(value) => handleChangeFuncao(index, value)}
                            funcoes={funcoesCadastradas}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFuncao(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleAddFuncao} 
                          className="gap-1"
                          disabled={funcoesCadastradas.length === 0}
                        >
                          <Plus className="w-3 h-3" />
                          Adicionar Função
                        </Button>
                        {funcoesCadastradas.length === 0 && (
                          <p className="text-xs text-amber-600 flex items-center">
                            Cadastre funções no módulo de Configurações primeiro
                          </p>
                        )}
                        <Button size="sm" onClick={handleSaveFuncoes} className="gap-1">
                          <Check className="w-3 h-3" />
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelFuncoes} className="gap-1">
                          <X className="w-3 h-3" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      {processo.funcoes && processo.funcoes.length > 0 ? (
                        <div className="space-y-2">
                          {processo.funcoes.map((funcao, index) => (
                            <div key={index} className="flex items-center py-2 px-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-900">{funcao}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">Nenhuma função definida.</p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEditFuncoes}
                        className="absolute -right-2 -top-2 transition-opacity gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Infraestrutura / Recursos */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-gray-600" />
                  <CardTitle className="text-base">Infraestrutura / Recursos</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {editingRecursos ? (
                    <div className="space-y-3">
                      {tempRecursos.map((recurso, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={recurso}
                            onChange={(e) => handleChangeRecurso(index, e.target.value)}
                            placeholder="Ex: Software ERP, Servidor dedicado..."
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRecurso(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={handleAddRecurso} className="gap-1">
                          <Plus className="w-3 h-3" />
                          Adicionar Recurso
                        </Button>
                        <Button size="sm" onClick={handleSaveRecursos} className="gap-1">
                          <Check className="w-3 h-3" />
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelRecursos} className="gap-1">
                          <X className="w-3 h-3" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      {processo.recursos && processo.recursos.length > 0 ? (
                        <div className="space-y-2">
                          {processo.recursos.map((recurso, index) => (
                            <div key={index} className="flex items-center py-2 px-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium text-gray-900">{recurso}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">Nenhum recurso definido.</p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEditRecursos}
                        className="absolute -right-2 -top-2 transition-opacity gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ZONA 2 - FLUXO DO PROCESSO */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Fluxo do Processo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-4">
                {/* Entradas (Coluna Esquerda) */}
                <div className="col-span-3">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 h-full">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm text-gray-900 flex items-center gap-2" style={{ fontWeight: 600 }}>
                        <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs">E</span>
                        Entradas
                      </h4>
                      {!editingEntradas && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleEditEntradas}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {editingEntradas ? (
                      <div className="space-y-2">
                        {tempEntradas.map((entrada, index) => (
                          <div key={index} className="flex items-start gap-1">
                            <span className="text-blue-500 mt-1">•</span>
                            <Input
                              value={entrada}
                              onChange={(e) => handleChangeEntrada(index, e.target.value)}
                              placeholder="Entrada..."
                              className="flex-1 h-8 text-xs"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveEntrada(index)}
                              className="h-6 w-6 p-0 text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex flex-col gap-1 pt-2">
                          <Button size="sm" variant="outline" onClick={handleAddEntrada} className="gap-1 h-7 text-xs">
                            <Plus className="w-3 h-3" />
                            Adicionar
                          </Button>
                          <Button size="sm" onClick={handleSaveEntradas} className="gap-1 h-7 text-xs">
                            <Check className="w-3 h-3" />
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEntradas} className="gap-1 h-7 text-xs">
                            <X className="w-3 h-3" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <ul className="space-y-2 text-sm text-gray-600">
                        {processo.entradas && processo.entradas.length > 0 ? (
                          processo.entradas.map((entrada, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span>
                              <span>{entrada}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-400 text-xs text-center py-2">Nenhuma entrada</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Atividades (Centro - Destaque) */}
                <div className="col-span-6">
                  <div className="bg-white rounded-xl p-4 border border-blue-300">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm text-gray-900 flex items-center justify-center gap-2" style={{ fontWeight: 600 }}>
                        <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs">P</span>
                        Processamento
                      </h4>
                      {!editingAtividades && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleEditAtividades}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {editingAtividades ? (
                      <div className="space-y-2">
                        {tempAtividades.map((atividade, index) => (
                          <div key={atividade.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold shrink-0">
                                {index + 1}
                              </div>
                              <Input
                                value={atividade.nome}
                                onChange={(e) => handleChangeAtividade(index, 'nome', e.target.value)}
                                placeholder="Nome da atividade"
                                className="flex-1 h-8 text-sm"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveAtividade(index)}
                                className="h-6 w-6 p-0 text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                            <Input
                              value={atividade.descricao || ''}
                              onChange={(e) => handleChangeAtividade(index, 'descricao', e.target.value)}
                              placeholder="Descrição (opcional)"
                              className="h-8 text-xs"
                            />
                          </div>
                        ))}
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={handleAddAtividade} className="gap-1">
                            <Plus className="w-3 h-3" />
                            Adicionar Atividade
                          </Button>
                          <Button size="sm" onClick={handleSaveAtividades} className="gap-1">
                            <Check className="w-3 h-3" />
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelAtividades} className="gap-1">
                            <X className="w-3 h-3" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {processo.atividades && processo.atividades.length > 0 ? (
                          processo.atividades.map((atividade, index) => (
                            <div key={atividade.id}>
                              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex items-start gap-3">
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold shrink-0">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900">{atividade.nome}</p>
                                    {atividade.descricao && (
                                      <p className="text-xs text-gray-600 mt-1">{atividade.descricao}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400 text-center py-4">Nenhuma atividade definida.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Saídas (Coluna Direita) */}
                <div className="col-span-3">
                  <div className="bg-white rounded-xl p-4 border border-blue-200 h-full">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm text-gray-900 flex items-center gap-2" style={{ fontWeight: 600 }}>
                        <span className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs">S</span>
                        Saídas
                      </h4>
                      {!editingSaidas && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleEditSaidas}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {editingSaidas ? (
                      <div className="space-y-2">
                        {tempSaidas.map((saida, index) => (
                          <div key={index} className="flex items-start gap-1">
                            <span className="text-green-500 mt-1">•</span>
                            <Input
                              value={saida}
                              onChange={(e) => handleChangeSaida(index, e.target.value)}
                              placeholder="Saída..."
                              className="flex-1 h-8 text-xs"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSaida(index)}
                              className="h-6 w-6 p-0 text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex flex-col gap-1 pt-2">
                          <Button size="sm" variant="outline" onClick={handleAddSaida} className="gap-1 h-7 text-xs">
                            <Plus className="w-3 h-3" />
                            Adicionar
                          </Button>
                          <Button size="sm" onClick={handleSaveSaidas} className="gap-1 h-7 text-xs">
                            <Check className="w-3 h-3" />
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelSaidas} className="gap-1 h-7 text-xs">
                            <X className="w-3 h-3" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <ul className="space-y-2 text-sm text-gray-600">
                        {processo.saidas && processo.saidas.length > 0 ? (
                          processo.saidas.map((saida, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-green-500 mt-1">•</span>
                              <span>{saida}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-400 text-xs text-center py-2">Nenhuma saída</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ZONA 3 - CONEXÕES (INTEGRAÇÕES) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conexões e Integrações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {/* Indicadores (KPI) */}
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <h4 className="text-gray-900" style={{ fontWeight: 600 }}>Indicadores (KPI)</h4>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {processo.indicadores?.length || 0}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Indicadores de desempenho vinculados a este processo
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setDrawerContent('indicadores')}
                  >
                    <FileText className="w-3 h-3" />
                    Ver Detalhes
                  </Button>
                </div>

                {/* Riscos */}
                <div className="border border-gray-200 rounded-lg p-4 hover:border-red-300 hover:bg-red-50/30 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                      <h4 className="text-gray-900" style={{ fontWeight: 600 }}>Riscos</h4>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {processo.riscos?.length || 0}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Riscos identificados e vinculados a este processo
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setDrawerContent('riscos')}
                  >
                    <FileText className="w-3 h-3" />
                    Ver Detalhes
                  </Button>
                </div>

                {/* Documentos */}
                <div className="border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:bg-green-50/30 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-green-600" />
                      <h4 className="text-gray-900" style={{ fontWeight: 600 }}>Documentos</h4>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {processo.documentos?.length || 0}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Procedimentos, instruções e documentos relacionados
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setDrawerContent('documentos')}
                  >
                    <FileText className="w-3 h-3" />
                    Ver Detalhes
                  </Button>
                </div>

                {/* Registros */}
                <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-purple-600" />
                      <h4 className="text-gray-900" style={{ fontWeight: 600 }}>Registros</h4>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {processo.registros?.length || 0}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Formulários e registros gerados por este processo
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setDrawerContent('registros')}
                  >
                    <FileText className="w-3 h-3" />
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DRAWER LATERAL - DETALHES DAS CONEXÕES */}
      <Dialog open={drawerContent !== null} onOpenChange={() => setDrawerContent(null)}>
        <DialogContent className="w-full sm:max-w-[600px] max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {drawerContent === 'indicadores' && 'Indicadores (KPI)'}
              {drawerContent === 'riscos' && 'Riscos'}
              {drawerContent === 'documentos' && 'Documentos'}
              {drawerContent === 'registros' && 'Registros'}
            </DialogTitle>
            <DialogDescription>
              {drawerContent === 'indicadores' && 'Indicadores de desempenho vinculados a este processo'}
              {drawerContent === 'riscos' && 'Riscos identificados e vinculados a este processo'}
              {drawerContent === 'documentos' && 'Documentos e procedimentos relacionados'}
              {drawerContent === 'registros' && 'Registros e formulários gerados'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <p className="text-sm text-gray-500 text-center py-8">
              Funcionalidade em desenvolvimento
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
