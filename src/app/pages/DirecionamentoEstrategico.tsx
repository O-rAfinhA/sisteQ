import { formatarData, capitalizarPrimeiraLetra } from '../utils/formatters';
import { useState } from 'react';
import { useStrategic } from '../context/StrategicContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Plus, X, Save, TrendingUp, Users, Cog, GraduationCap, Edit2, Target, FileText, Link as LinkIcon, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PerspectivaBsc, PoliticaBscItem, ObjetivoBscItem, ValorOrganizacional } from '../types/strategic';
import { generateId, getFromStorage, setToStorage } from '../utils/helpers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { ObjetivoDialog } from '../components/ObjetivoDialog';
import { PlanoAcaoSelector } from '../components/PlanoAcaoSelector';
import { PAEDetailsDialog } from '../components/PAEDetailsDialog';
import { MetricCard } from '../components/ui/metric-card';

const perspectivasConfig = {
  financeira: { label: 'Financeira', icon: TrendingUp, color: 'text-green-600' },
  clientes: { label: 'Clientes', icon: Users, color: 'text-blue-600' },
  processos: { label: 'Processos Internos', icon: Cog, color: 'text-purple-600' },
  aprendizado: { label: 'Aprendizado e Crescimento', icon: GraduationCap, color: 'text-orange-600' },
};

export default function DirecionamentoEstrategico() {
  const { dados, updateDirecionamento } = useStrategic();
  const [formData, setFormData] = useState(dados.direcionamento);
  type AiField = 'missao' | 'visao' | 'valores' | 'politicaQualidade';
  const createEmptyAiState = (): Record<AiField, { loading: boolean; suggestions: string[]; error: string | null }> => ({
    missao: { loading: false, suggestions: [], error: null },
    visao: { loading: false, suggestions: [], error: null },
    valores: { loading: false, suggestions: [], error: null },
    politicaQualidade: { loading: false, suggestions: [], error: null },
  });
  const [aiState, setAiState] = useState<Record<AiField, { loading: boolean; suggestions: string[]; error: string | null }>>(createEmptyAiState());
  
  // Estados para PAE Details Dialog
  const [isPAEDetailsOpen, setIsPAEDetailsOpen] = useState(false);
  const [selectedPAE, setSelectedPAE] = useState<any>(null);
  
  // Estados para Valores
  const [novoValor, setNovoValor] = useState('');
  const [novaExplicacao, setNovaExplicacao] = useState('');
  
  // Estados para Política BSC
  const [novaPoliticaBsc, setNovaPoliticaBsc] = useState('');
  const [perspectivaPoliticaSelecionada, setPerspectivaPoliticaSelecionada] = useState<PerspectivaBsc>('financeira');
  
  // Estados para Objetivos BSC
  const [perspectivaObjetivoSelecionada, setPerspectivaObjetivoSelecionada] = useState<PerspectivaBsc>('financeira');

  const handleSave = () => {
    updateDirecionamento(formData);
    toast.success('Direcionamento estratégico salvo com sucesso!');
  };

  const AI_SUGGESTIONS_CACHE_KEY = 'sisteq-ai-sugestoes-direcionamento-v1';
  const AI_SUGGESTIONS_CACHE_TTL_MS = 24 * 60 * 60_000;

  const hashString = (input: string) => {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  };

  const buildCompanyContext = () => {
    const c = dados.cenario;
    const objetivos = formData.objetivosBsc
      .map(o => `${o.numeroObjetivo}: ${o.descricao}`.trim())
      .filter(Boolean)
      .slice(0, 8);
    const linhas: string[] = [];
    if (c.historicoEmpresa?.trim()) linhas.push(`Histórico: ${c.historicoEmpresa.trim()}`);
    if (c.produtosServicos?.trim()) linhas.push(`Produtos/Serviços: ${c.produtosServicos.trim()}`);
    if (c.regiaoAtuacao?.trim()) linhas.push(`Região de atuação: ${c.regiaoAtuacao.trim()}`);
    if (c.canaisVenda?.trim()) linhas.push(`Canais de venda: ${c.canaisVenda.trim()}`);
    if (c.principaisClientes?.length) linhas.push(`Principais clientes: ${c.principaisClientes.map(x => x?.nome || '').filter(Boolean).join(', ')}`);
    if (c.principaisFornecedores?.length) linhas.push(`Principais fornecedores: ${c.principaisFornecedores.map(x => x?.nome || '').filter(Boolean).join(', ')}`);
    if (c.principaisConcorrentes?.length) linhas.push(`Principais concorrentes: ${c.principaisConcorrentes.map(x => x?.nome || '').filter(Boolean).join(', ')}`);
    if (objetivos.length) linhas.push(`Objetivos BSC: ${objetivos.join(' | ')}`);
    return linhas.join('\n').trim();
  };

  const getCurrentTextByField = (field: AiField) => {
    if (field === 'missao') return formData.missao || '';
    if (field === 'visao') return formData.visao || '';
    if (field === 'politicaQualidade') return formData.politicaQualidade || '';
    return '';
  };

  const clearAiSuggestionsAfterApply = (field: AiField) => {
    try {
      console.info(JSON.stringify({ event: 'ai.sugestao_aplicada', field }));
      setAiState(prev => ({ ...prev, [field]: { loading: false, suggestions: [], error: null } }));
      console.info(JSON.stringify({ event: 'ai.sugestoes_limpas', field }));
    } catch (e: any) {
      console.error(
        JSON.stringify({
          event: 'ai.sugestoes_limpeza_falhou',
          field,
          error: e?.message || String(e),
        }),
      );
      setAiState(prev => ({ ...prev, [field]: { loading: false, suggestions: [], error: null } }));
      toast.error('Falha ao limpar as sugestões de IA. Tente novamente.');
    }
  };

  const applySuggestionToField = (field: AiField, suggestion: string) => {
    if (!suggestion.trim()) return;
    if (field === 'valores') {
      const lines = suggestion
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);
      const parsed: ValorOrganizacional[] = [];
      for (const l of lines) {
        const cleaned = l.replace(/^\-+\s*/, '').trim();
        const m =
          cleaned.match(/^(.+?)\s*:\s*(.+)$/) ||
          cleaned.match(/^(.+?)\s*[–—]\s*(.+)$/) ||
          cleaned.match(/^(.+?)\s+-\s+(.+)$/);
        if (!m) continue;
        const valor = m[1].trim();
        const explicacao = m[2].trim();
        if (!valor) continue;
        parsed.push({ id: generateId(), valor, explicacao });
      }
      if (parsed.length === 0) {
        toast.error('Não foi possível interpretar a sugestão em valores.');
        return;
      }
      setFormData(prev => ({ ...prev, valores: [...prev.valores, ...parsed] }));
      toast.success('Sugestão aplicada: valores adicionados.');
      clearAiSuggestionsAfterApply(field);
      return;
    }
    setFormData(prev => ({ ...prev, [field]: suggestion } as any));
    toast.success('Sugestão aplicada ao campo.');
    clearAiSuggestionsAfterApply(field);
  };

  const requestAiSuggestions = async (field: AiField, opts?: { force?: boolean }) => {
    const force = Boolean(opts?.force);
    const companyContext = buildCompanyContext();
    if (!companyContext) {
      toast.error('Preencha o Cenário Organizacional para gerar sugestões.');
      return;
    }
    const expectedCount = field === 'valores' ? 1 : 3;
    const currentText = getCurrentTextByField(field);
    const cacheKey = hashString(JSON.stringify({ field, companyContext, currentText }));
    const cache = getFromStorage<Record<string, { createdAt: number; suggestions: string[] }>>(AI_SUGGESTIONS_CACHE_KEY, {});
    const cached = cache[cacheKey];
    if (!force && cached && Date.now() - cached.createdAt < AI_SUGGESTIONS_CACHE_TTL_MS && cached.suggestions?.length === expectedCount) {
      setAiState(prev => ({ ...prev, [field]: { loading: false, suggestions: cached.suggestions, error: null } }));
      return;
    }

    setAiState(prev => ({ ...prev, [field]: { ...prev[field], loading: true, error: null } }));
    try {
      const res = await fetch('/api/ai/sugestao-direcionamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, companyContext, currentText }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Falha ao gerar sugestões');
      const suggestions = Array.isArray(data?.suggestions) ? data.suggestions.map((s: any) => String(s ?? '').trim()).filter(Boolean) : [];
      if (suggestions.length !== expectedCount) {
        throw new Error(expectedCount === 1 ? 'Não foi possível obter uma sugestão. Tente novamente.' : 'Não foi possível obter 3 sugestões distintas.');
      }
      setAiState(prev => ({ ...prev, [field]: { loading: false, suggestions, error: null } }));
      setToStorage(AI_SUGGESTIONS_CACHE_KEY, { ...cache, [cacheKey]: { createdAt: Date.now(), suggestions } });
    } catch (e: any) {
      const msg = e?.message || 'Falha ao gerar sugestões';
      setAiState(prev => ({ ...prev, [field]: { ...prev[field], loading: false, error: msg } }));
      toast.error(msg);
    }
  };

  // Funções para Valores
  const addValor = () => {
    if (novoValor.trim()) {
      const newValor: ValorOrganizacional = {
        id: generateId(),
        valor: novoValor.trim(),
        explicacao: novaExplicacao.trim(),
      };
      setFormData(prev => ({
        ...prev,
        valores: [...prev.valores, newValor],
      }));
      setNovoValor('');
      setNovaExplicacao('');
    }
  };

  const removeValor = (id: string) => {
    setFormData(prev => ({
      ...prev,
      valores: prev.valores.filter(v => v.id !== id),
    }));
  };

  const updateValor = (id: string, valor: string, explicacao: string) => {
    setFormData(prev => ({
      ...prev,
      valores: prev.valores.map(v => 
        v.id === id ? { ...v, valor, explicacao } : v
      ),
    }));
  };

  // Funções para Política BSC
  const addPoliticaBsc = () => {
    if (novaPoliticaBsc.trim()) {
      const newItem: PoliticaBscItem = {
        id: generateId(),
        perspectiva: perspectivaPoliticaSelecionada,
        descricao: novaPoliticaBsc.trim(),
      };
      setFormData(prev => ({
        ...prev,
        politicaBsc: [...prev.politicaBsc, newItem],
      }));
      setNovaPoliticaBsc('');
    }
  };

  const removePoliticaBsc = (id: string) => {
    setFormData(prev => ({
      ...prev,
      politicaBsc: prev.politicaBsc.filter(item => item.id !== id),
    }));
  };

  const updatePoliticaBsc = (id: string, descricao: string) => {
    setFormData(prev => ({
      ...prev,
      politicaBsc: prev.politicaBsc.map(item => 
        item.id === id ? { ...item, descricao } : item
      ),
    }));
  };

  // Funções para Objetivos BSC
  const addObjetivoBsc = (objetivo: Omit<ObjetivoBscItem, 'id' | 'numeroObjetivo'>) => {
    // Gerar próximo número de objetivo
    const proximoNumero = formData.objetivosBsc.length + 1;
    const numeroObjetivo = `OBJ${proximoNumero}`;
    
    const newItem: ObjetivoBscItem = {
      ...objetivo,
      id: generateId(),
      numeroObjetivo,
    };
    setFormData(prev => ({
      ...prev,
      objetivosBsc: [...prev.objetivosBsc, newItem],
    }));
  };

  const removeObjetivoBsc = (id: string) => {
    setFormData(prev => ({
      ...prev,
      objetivosBsc: prev.objetivosBsc.filter(item => item.id !== id),
    }));
  };

  const updateObjetivoBsc = (id: string, updates: Partial<ObjetivoBscItem>) => {
    setFormData(prev => ({
      ...prev,
      objetivosBsc: prev.objetivosBsc.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  };

  const getPoliticasPorPerspectiva = (perspectiva: PerspectivaBsc) => {
    return formData.politicaBsc.filter(p => p.perspectiva === perspectiva);
  };

  const getPlanoAcaoNome = (numeroPAE?: string) => {
    if (!numeroPAE) return null;
    const plano = dados.planosAcao.find(p => p.numeroPAE === numeroPAE);
    return plano ? { numeroPAE: plano.numeroPAE, id: plano.id } : null;
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* ═══ PAGE HEADER ═══ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Direcionamento Estratégico
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Defina a missão, visão, valores e desdobramento da política da qualidade.
          </p>
        </div>
        <Button onClick={handleSave} variant="black" className="gap-2 flex-shrink-0 ml-8">
          <Save className="w-4 h-4" />
          Salvar Alterações
        </Button>
      </div>

      <div className="space-y-8">
        {/* MetricCards de Resumo */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            label="Valores Definidos"
            value={formData.valores.length}
            icon={Target}
            variant="default"
          />
          <MetricCard
            label="Desdobramentos"
            value={formData.politicaBsc.length}
            icon={FileText}
            variant="info"
          />
          <MetricCard
            label="Objetivos BSC"
            value={formData.objetivosBsc.length}
            icon={TrendingUp}
            variant="success"
          />
          <MetricCard
            label="Com PE Vinculado"
            value={formData.objetivosBsc.filter(o => o.planoAcaoVinculado).length}
            icon={LinkIcon}
            variant="purple"
          />
        </div>

        {/* Missão */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs" style={{ fontWeight: 600 }}>1</div>
              <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Missão</h3>
              <span className="text-xs text-gray-400">Razão de existir da organização</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50 active:bg-purple-100 focus-visible:ring-2 focus-visible:ring-purple-400"
              onClick={() => requestAiSuggestions('missao')}
              disabled={aiState.missao.loading}
            >
              {aiState.missao.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Sugestão IA
            </Button>
          </div>
          <Textarea
            value={formData.missao}
            onChange={(e) => setFormData(prev => ({ ...prev, missao: e.target.value }))}
            placeholder="Ex: Fornecer soluções inovadoras que transformam negócios..."
            rows={4}
            className="resize-none"
          />
          {(aiState.missao.loading || aiState.missao.error || aiState.missao.suggestions.length > 0) && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Sugestões</p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => requestAiSuggestions('missao', { force: true })}
                    disabled={aiState.missao.loading}
                  >
                    Atualizar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAiState(prev => ({ ...prev, missao: { loading: false, suggestions: [], error: null } }))}
                    disabled={aiState.missao.loading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {aiState.missao.error && <p className="text-sm text-red-600">{aiState.missao.error}</p>}
              <div className="grid gap-3">
                {aiState.missao.suggestions.map((s, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{s}</p>
                    <div className="flex justify-end mt-2">
                      <Button size="sm" onClick={() => applySuggestionToField('missao', s)}>
                        Aplicar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Visão */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs" style={{ fontWeight: 600 }}>2</div>
              <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Visão</h3>
              <span className="text-xs text-gray-400">Onde a organização deseja chegar</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50 active:bg-purple-100 focus-visible:ring-2 focus-visible:ring-purple-400"
              onClick={() => requestAiSuggestions('visao')}
              disabled={aiState.visao.loading}
            >
              {aiState.visao.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Sugestão IA
            </Button>
          </div>
          <Textarea
            value={formData.visao}
            onChange={(e) => setFormData(prev => ({ ...prev, visao: e.target.value }))}
            placeholder="Ex: Ser reconhecida como líder de mercado até 2030..."
            rows={4}
            className="resize-none"
          />
          {(aiState.visao.loading || aiState.visao.error || aiState.visao.suggestions.length > 0) && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Sugestões</p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => requestAiSuggestions('visao', { force: true })}
                    disabled={aiState.visao.loading}
                  >
                    Atualizar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAiState(prev => ({ ...prev, visao: { loading: false, suggestions: [], error: null } }))}
                    disabled={aiState.visao.loading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {aiState.visao.error && <p className="text-sm text-red-600">{aiState.visao.error}</p>}
              <div className="grid gap-3">
                {aiState.visao.suggestions.map((s, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{s}</p>
                    <div className="flex justify-end mt-2">
                      <Button size="sm" onClick={() => applySuggestionToField('visao', s)}>
                        Aplicar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Valores */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs" style={{ fontWeight: 600 }}>3</div>
              <div>
                <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Valores</h3>
                <p className="text-xs text-gray-400">Princípios e crenças que guiam as ações da organização</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50 active:bg-purple-100 focus-visible:ring-2 focus-visible:ring-purple-400"
                onClick={() => requestAiSuggestions('valores')}
                disabled={aiState.valores.loading}
              >
                {aiState.valores.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Sugestão IA
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Valor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Valor</DialogTitle>
                    <DialogDescription>
                      Defina um valor organizacional e sua explicação.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Valor *</Label>
                      <Input
                        value={novoValor}
                        onChange={(e) => setNovoValor(e.target.value)}
                        placeholder="Ex: Integridade"
                      />
                    </div>
                    <div>
                      <Label>Explicação do Valor</Label>
                      <Textarea
                        value={novaExplicacao}
                        onChange={(e) => setNovaExplicacao(e.target.value)}
                        placeholder="Ex: Agimos com transparência..."
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (novoValor.trim()) {
                          addValor();
                          toast.success('Valor adicionado!');
                        } else {
                          toast.error('Preencha o nome do valor.');
                        }
                      }}
                      className="w-full"
                    >
                      Adicionar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {(aiState.valores.loading || aiState.valores.error || aiState.valores.suggestions.length > 0) && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Sugestões</p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => requestAiSuggestions('valores', { force: true })}
                      disabled={aiState.valores.loading}
                    >
                      Atualizar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAiState(prev => ({ ...prev, valores: { loading: false, suggestions: [], error: null } }))}
                      disabled={aiState.valores.loading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {aiState.valores.error && <p className="text-sm text-red-600">{aiState.valores.error}</p>}
                <div className="grid gap-3">
                  {aiState.valores.suggestions.map((s, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 bg-white p-3">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{s}</p>
                      <div className="flex justify-end mt-2">
                        <Button size="sm" onClick={() => applySuggestionToField('valores', s)}>
                          Aplicar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {formData.valores.map((valorItem) => (
                <div key={valorItem.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{valorItem.valor}</p>
                      <p className="text-sm text-gray-500">{valorItem.explicacao || 'Sem explicação'}</p>
                    </div>
                    <div className="flex gap-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Valor</DialogTitle>
                            <DialogDescription>
                              Atualize o valor e sua explicação.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div>
                              <Label>Valor</Label>
                              <Input
                                defaultValue={valorItem.valor}
                                id={`edit-valor-${valorItem.id}`}
                              />
                            </div>
                            <div>
                              <Label>Explicação</Label>
                              <Textarea
                                defaultValue={valorItem.explicacao}
                                id={`edit-explicacao-${valorItem.id}`}
                                rows={3}
                              />
                            </div>
                            <Button
                              onClick={() => {
                                const valor = (document.getElementById(`edit-valor-${valorItem.id}`) as HTMLInputElement).value;
                                const explicacao = (document.getElementById(`edit-explicacao-${valorItem.id}`) as HTMLTextAreaElement).value;
                                updateValor(valorItem.id, valor, explicacao);
                                toast.success('Valor atualizado!');
                              }}
                              className="w-full"
                            >
                              Salvar
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeValor(valorItem.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {formData.valores.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">
                Nenhum valor definido. Clique em "Adicionar Valor" para começar.
              </p>
            )}
          </div>
        </div>

        {/* Política da Qualidade */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs" style={{ fontWeight: 600 }}>4</div>
              <div>
                <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Política da Qualidade</h3>
                <p className="text-xs text-gray-400">Compromisso da organização com a qualidade</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50 active:bg-purple-100 focus-visible:ring-2 focus-visible:ring-purple-400"
              onClick={() => requestAiSuggestions('politicaQualidade')}
              disabled={aiState.politicaQualidade.loading}
            >
              {aiState.politicaQualidade.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Sugestão IA
            </Button>
          </div>

          {/* Política Textual */}
          <div>
            <Textarea
              value={formData.politicaQualidade}
              onChange={(e) => setFormData(prev => ({ ...prev, politicaQualidade: e.target.value }))}
              placeholder="Ex: Nosso compromisso é fornecer produtos e serviços que atendam aos requisitos..."
              rows={4}
              className="resize-none"
            />
            {(aiState.politicaQualidade.loading || aiState.politicaQualidade.error || aiState.politicaQualidade.suggestions.length > 0) && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Sugestões</p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => requestAiSuggestions('politicaQualidade', { force: true })}
                      disabled={aiState.politicaQualidade.loading}
                    >
                      Atualizar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAiState(prev => ({ ...prev, politicaQualidade: { loading: false, suggestions: [], error: null } }))}
                      disabled={aiState.politicaQualidade.loading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {aiState.politicaQualidade.error && <p className="text-sm text-red-600">{aiState.politicaQualidade.error}</p>}
                <div className="grid gap-3">
                  {aiState.politicaQualidade.suggestions.map((s, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 bg-white p-3">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{s}</p>
                      <div className="flex justify-end mt-2">
                        <Button size="sm" onClick={() => applySuggestionToField('politicaQualidade', s)}>
                          Aplicar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Desdobramento da Política (BSC) */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-start justify-between mb-4">
              <h4 className="text-gray-900" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Desdobramento da Política</h4>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Desdobramento
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Desdobramento</DialogTitle>
                    <DialogDescription>
                      Adicione um desdobramento da política em uma perspectiva BSC.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Perspectiva BSC *</Label>
                      <Select 
                        value={perspectivaPoliticaSelecionada} 
                        onValueChange={(value) => setPerspectivaPoliticaSelecionada(value as PerspectivaBsc)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(perspectivasConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Descrição *</Label>
                      <Textarea
                        value={novaPoliticaBsc}
                        onChange={(e) => setNovaPoliticaBsc(e.target.value)}
                        placeholder="Descreva o desdobramento para esta perspectiva..."
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (novaPoliticaBsc.trim()) {
                          addPoliticaBsc();
                          toast.success('Desdobramento adicionado!');
                        } else {
                          toast.error('Preencha a descrição.');
                        }
                      }}
                      className="w-full"
                    >
                      Adicionar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Tabela de Desdobramentos */}
            {formData.politicaBsc.length > 0 ? (
              <>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/60">
                        <th className="px-4 py-3 text-left text-xs text-gray-500 w-48" style={{ fontWeight: 500 }}>Perspectiva BSC</th>
                        <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Descrição</th>
                        <th className="px-4 py-3 text-center text-xs text-gray-500 w-24" style={{ fontWeight: 500 }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {formData.politicaBsc.map((politica) => {
                        const config = perspectivasConfig[politica.perspectiva];
                        const Icon = config.icon;
                        
                        return (
                          <tr key={politica.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${config.color}`} />
                                <span className="text-sm font-medium">{config.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-700">{politica.descricao}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Editar Desdobramento</DialogTitle>
                                      <DialogDescription>
                                        Atualize a descrição do desdobramento da política.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                      <div>
                                        <Label>Descrição</Label>
                                        <Textarea
                                          defaultValue={politica.descricao}
                                          id={`edit-politica-${politica.id}`}
                                          rows={3}
                                        />
                                      </div>
                                      <Button
                                        onClick={() => {
                                          const descricao = (document.getElementById(`edit-politica-${politica.id}`) as HTMLTextAreaElement).value;
                                          updatePoliticaBsc(politica.id, descricao);
                                          toast.success('Desdobramento atualizado!');
                                        }}
                                        className="w-full"
                                      >
                                        Salvar
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => removePoliticaBsc(politica.id)}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 italic mt-3">
                  * Este desdobramento será mensurado na sessão de objetivos.
                </p>
              </>
            ) : (
              <div className="border rounded-lg p-8 text-center">
                <p className="text-sm text-gray-400">Nenhum desdobramento definido</p>
              </div>
            )}
          </div>
        </div>

        {/* Escopo de Certificação */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs" style={{ fontWeight: 600 }}>5</div>
            <div>
              <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Escopo de Certificação</h3>
              <p className="text-xs text-gray-400">Produtos, serviços e processos abrangidos pela certificação</p>
            </div>
          </div>
          <Textarea
            value={formData.escopoCertificacao}
            onChange={(e) => setFormData(prev => ({ ...prev, escopoCertificacao: capitalizarPrimeiraLetra(e.target.value) }))}
            placeholder="Ex: Fabricação e comercialização de produtos eletrônicos, incluindo serviços de assistência técnica..."
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Exclusão de Requisito */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs" style={{ fontWeight: 600 }}>6</div>
            <div>
              <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Exclusão de Requisito</h3>
              <p className="text-xs text-gray-400">Requisitos excluídos da certificação com justificativa</p>
            </div>
          </div>
          <Textarea
            value={formData.exclusaoRequisito}
            onChange={(e) => setFormData(prev => ({ ...prev, exclusaoRequisito: capitalizarPrimeiraLetra(e.target.value) }))}
            placeholder="Ex: Item 8.3 - Projeto e desenvolvimento de produtos e serviços (não aplicável)..."
            rows={4}
            className="resize-none"
          />
        </div>
      </div>
    </div>
  );
}
