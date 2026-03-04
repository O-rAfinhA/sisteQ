import { useState } from 'react';
import { useStrategic } from '../context/StrategicContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Plus, X, Save, Edit2, Star, Users, Building2, Swords, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { ItemComRelevancia } from '../types/strategic';
import { generateId } from '../utils/helpers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { MetricCard } from '../components/ui/metric-card';

const niveisRelevancia = {
  1: { label: 'Baixa', color: 'text-gray-500', bgColor: 'bg-gray-50' },
  2: { label: 'Média', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  3: { label: 'Alta', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
};

export default function CenarioOrganizacional() {
  const { dados, updateCenario } = useStrategic();
  const [formData, setFormData] = useState(dados.cenario);

  const handleSave = () => {
    updateCenario(formData);
    toast.success('Contexto organizacional salvo com sucesso!');
  };

  const addItemComRelevancia = (tipo: 'principaisClientes' | 'principaisFornecedores' | 'principaisConcorrentes', nome: string, nivelRelevancia: 1 | 2 | 3) => {
    if (nome.trim()) {
      const newItem: ItemComRelevancia = {
        id: generateId(),
        nome: nome.trim(),
        nivelRelevancia,
      };
      setFormData(prev => ({
        ...prev,
        [tipo]: [...prev[tipo], newItem],
      }));
    }
  };

  const removeItemComRelevancia = (tipo: 'principaisClientes' | 'principaisFornecedores' | 'principaisConcorrentes', id: string) => {
    setFormData(prev => ({
      ...prev,
      [tipo]: prev[tipo].filter(item => item.id !== id),
    }));
  };

  const updateItemComRelevancia = (tipo: 'principaisClientes' | 'principaisFornecedores' | 'principaisConcorrentes', id: string, nome: string, nivelRelevancia: 1 | 2 | 3) => {
    setFormData(prev => ({
      ...prev,
      [tipo]: prev[tipo].map(item => 
        item.id === id ? { ...item, nome, nivelRelevancia } : item
      ),
    }));
  };

  const renderStars = (nivel: 1 | 2 | 3) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${i <= nivel ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
          />
        ))}
      </div>
    );
  };

  const ItemComRelevanciaSection = ({
    titulo,
    descricao,
    items,
    tipo,
    placeholder,
    stepNumber,
  }: {
    titulo: string;
    descricao: string;
    items: ItemComRelevancia[];
    tipo: 'principaisClientes' | 'principaisFornecedores' | 'principaisConcorrentes';
    placeholder: string;
    stepNumber: number;
  }) => {
    const [novoNome, setNovoNome] = useState('');
    const [novaRelevancia, setNovaRelevancia] = useState<1 | 2 | 3>(2);

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs" style={{ fontWeight: 600 }}>
              {stepNumber}
            </div>
            <div>
              <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{titulo}</h3>
              <p className="text-xs text-gray-400">{descricao}</p>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar {titulo}</DialogTitle>
                <DialogDescription>
                  Adicione um novo item e defina o nível de relevância.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
                <div>
                  <Label>Nível de Relevância *</Label>
                  <Select 
                    value={novaRelevancia.toString()} 
                    onValueChange={(value) => setNovaRelevancia(parseInt(value) as 1 | 2 | 3)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Baixa</SelectItem>
                      <SelectItem value="2">Média</SelectItem>
                      <SelectItem value="3">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => {
                    if (novoNome.trim()) {
                      addItemComRelevancia(tipo, novoNome, novaRelevancia);
                      setNovoNome('');
                      setNovaRelevancia(2);
                      toast.success('Item adicionado!');
                    } else {
                      toast.error('Preencha o nome do item.');
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

        <div className="p-6">
          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => {
                const nivelValido = (item.nivelRelevancia === 1 || item.nivelRelevancia === 2 || item.nivelRelevancia === 3) 
                  ? item.nivelRelevancia 
                  : 2;
                const config = niveisRelevancia[nivelValido];
                return (
                  <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border border-gray-100 ${config.bgColor}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>{item.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {renderStars(nivelValido)}
                        <span className={`text-xs ${config.color}`}>{config.label}</span>
                      </div>
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Item</DialogTitle>
                            <DialogDescription>
                              Atualize o nome e o nível de relevância do item.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div>
                              <Label>Nome</Label>
                              <Input
                                defaultValue={item.nome}
                                id={`edit-nome-${item.id}`}
                              />
                            </div>
                            <div>
                              <Label>Nível de Relevância</Label>
                              <Select defaultValue={nivelValido.toString()}>
                                <SelectTrigger id={`edit-relevancia-${item.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Baixa</SelectItem>
                                  <SelectItem value="2">Média</SelectItem>
                                  <SelectItem value="3">Alta</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              onClick={() => {
                                const nome = (document.getElementById(`edit-nome-${item.id}`) as HTMLInputElement).value;
                                const relevancia = parseInt((document.getElementById(`edit-relevancia-${item.id}`) as any).value) as 1 | 2 | 3;
                                updateItemComRelevancia(tipo, item.id, nome, relevancia);
                                toast.success('Item atualizado!');
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
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeItemComRelevancia(tipo, item.id)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">
              Nenhum item cadastrado. Clique em "Adicionar" para começar.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* ═══ PAGE HEADER ═══ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Contexto Organizacional
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Descreva o contexto no qual a organização opera, incluindo sua história, produtos, mercado e parceiros.
          </p>
        </div>
        <Button onClick={handleSave} variant="black" className="gap-2 flex-shrink-0 ml-8">
          <Save className="w-4 h-4" />
          Salvar Alterações
        </Button>
      </div>

      {/* ═══ MetricCards de Resumo ═══ */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Principais Clientes"
          value={formData.principaisClientes.length}
          icon={Users}
          variant="info"
        />
        <MetricCard
          label="Principais Fornecedores"
          value={formData.principaisFornecedores.length}
          icon={Building2}
          variant="success"
        />
        <MetricCard
          label="Principais Concorrentes"
          value={formData.principaisConcorrentes.length}
          icon={Swords}
          variant="warning"
        />
      </div>

      {/* ═══ SEÇÕES DE TEXTO ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs" style={{ fontWeight: 600 }}>1</div>
            <div>
              <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Histórico da Empresa</h3>
              <p className="text-xs text-gray-400 mt-0.5">Como a empresa surgiu, cresceu e chegou até o momento atual.</p>
            </div>
          </div>
          <Textarea
            value={formData.historicoEmpresa || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, historicoEmpresa: e.target.value }))}
            placeholder="Descreva a trajetória da organização: fundação, marcos importantes, crescimento, transformações e como chegou ao cenário atual..."
            rows={5}
            className="resize-none"
          />
        </div>

        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs" style={{ fontWeight: 600 }}>2</div>
            <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Produtos e Serviços</h3>
          </div>
          <Textarea
            value={formData.produtosServicos}
            onChange={(e) => setFormData(prev => ({ ...prev, produtosServicos: e.target.value }))}
            placeholder="Ex: Consultoria empresarial, software de gestão, treinamentos..."
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs" style={{ fontWeight: 600 }}>3</div>
            <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Região de Atuação</h3>
          </div>
          <Textarea
            value={formData.regiaoAtuacao}
            onChange={(e) => setFormData(prev => ({ ...prev, regiaoAtuacao: e.target.value }))}
            placeholder="Ex: Sudeste do Brasil, com foco em São Paulo e Rio de Janeiro..."
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs" style={{ fontWeight: 600 }}>4</div>
            <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Canais de Venda</h3>
          </div>
          <Textarea
            value={formData.canaisVenda}
            onChange={(e) => setFormData(prev => ({ ...prev, canaisVenda: e.target.value }))}
            placeholder="Ex: E-commerce, Loja física, Representantes comerciais, Marketplace..."
            rows={2}
            className="resize-none"
          />
        </div>
      </div>

      {/* ═══ LISTAS COM RELEVÂNCIA ═══ */}
      <ItemComRelevanciaSection
        titulo="Principais Clientes"
        descricao="Clientes ou segmentos de clientes e nível de relevância"
        items={formData.principaisClientes}
        tipo="principaisClientes"
        placeholder="Ex: Empresas de médio porte, Setor industrial..."
        stepNumber={5}
      />

      <ItemComRelevanciaSection
        titulo="Principais Fornecedores"
        descricao="Fornecedores ou parceiros estratégicos e nível de relevância"
        items={formData.principaisFornecedores}
        tipo="principaisFornecedores"
        placeholder="Ex: Fornecedor de matéria-prima, Parceiro tecnológico..."
        stepNumber={6}
      />

      <ItemComRelevanciaSection
        titulo="Principais Concorrentes"
        descricao="Concorrentes e nível de relevância competitiva"
        items={formData.principaisConcorrentes}
        tipo="principaisConcorrentes"
        placeholder="Ex: Concorrente A, Empresa rival..."
        stepNumber={7}
      />
    </div>
  );
}
