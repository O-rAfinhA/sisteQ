import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useStrategic } from '../context/StrategicContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { MetricCard } from '../components/ui/metric-card';
import { Plus, Trash2, Edit, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Link as LinkIcon, ExternalLink, BarChart3, Zap, ClipboardList } from 'lucide-react';
import { SwotItem, SwotQuadrante } from '../types/strategic';
import { toast } from 'sonner';
import { PlanoAcaoSelector } from '../components/PlanoAcaoSelector';
import { QuickPAEDialog } from '../components/QuickPAEDialog';
import { PAEDetailsDialog } from '../components/PAEDetailsDialog';
import { formatarData } from '../utils/formatters';

const QUADRANTES = {
  forcas: { label: 'Forças', color: 'bg-green-50 border-green-200', icon: TrendingUp, iconColor: 'text-green-600' },
  fraquezas: { label: 'Fraquezas', color: 'bg-red-50 border-red-200', icon: TrendingDown, iconColor: 'text-red-600' },
  oportunidades: { label: 'Oportunidades', color: 'bg-blue-50 border-blue-200', icon: CheckCircle2, iconColor: 'text-blue-600' },
  ameacas: { label: 'Ameaças', color: 'bg-yellow-50 border-yellow-200', icon: AlertCircle, iconColor: 'text-yellow-600' },
};

const NIVEIS_RELEVANCIA = {
  1: { label: 'Baixo', color: 'bg-blue-100 text-blue-700' },
  2: { label: 'Médio', color: 'bg-yellow-100 text-yellow-700' },
  3: { label: 'Alto', color: 'bg-red-100 text-red-700' },
};

// Helper para normalizar nível de relevância
const getNivelRelevancia = (nivel: any): 1 | 2 | 3 => {
  const n = Number(nivel);
  if (n <= 1 || isNaN(n)) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  // Se for 4 ou 5 (dados antigos), mapeia para Alto
  if (n >= 4) return 3;
  return 2; // Default para Médio
};

export default function AnaliseSwot() {
  const navigate = useNavigate();
  const { dados, addSwotItem, updateSwotItem, deleteSwotItem, addPlanoAcao } = useStrategic();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQuickPAEDialogOpen, setIsQuickPAEDialogOpen] = useState(false);
  const [isPAEDetailsDialogOpen, setIsPAEDetailsDialogOpen] = useState(false);
  const [selectedPAE, setSelectedPAE] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<SwotItem | null>(null);
  const [formData, setFormData] = useState<{
    quadrante: SwotQuadrante;
    descricao: string;
    nivelRelevancia: 1 | 2 | 3;
    tomarAcao: boolean;
    planoAcaoVinculado?: string;
  }>({
    quadrante: 'forcas',
    descricao: '',
    nivelRelevancia: 3,
    tomarAcao: false,
  });

  const handleSubmit = () => {
    if (!formData.descricao.trim()) {
      toast.error('Por favor, preencha a descrição do item.');
      return;
    }

    if (editingItem) {
      updateSwotItem(editingItem.id, {
        ...formData,
        planoAcaoVinculado: formData.planoAcaoVinculado === 'none' ? undefined : formData.planoAcaoVinculado,
      });
      toast.success('Item SWOT atualizado com sucesso!');
    } else {
      addSwotItem({
        ...formData,
        planoAcaoVinculado: formData.planoAcaoVinculado === 'none' ? undefined : formData.planoAcaoVinculado,
      });
      toast.success('Item SWOT adicionado com sucesso!');
    }

    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      quadrante: 'forcas',
      descricao: '',
      nivelRelevancia: 3,
      tomarAcao: false,
    });
  };

  const handleEdit = (item: SwotItem) => {
    setEditingItem(item);
    setFormData({
      quadrante: item.quadrante,
      descricao: item.descricao,
      nivelRelevancia: getNivelRelevancia(item.nivelRelevancia),
      tomarAcao: item.tomarAcao,
      planoAcaoVinculado: item.planoAcaoVinculado || 'none',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteSwotItem(id);
    toast.success('Item SWOT removido com sucesso!');
  };

  const getPlanoAcaoInfo = (numeroPAE?: string) => {
    if (!numeroPAE) return null;
    const plano = dados.planosAcao.find(p => p.numeroPE === numeroPAE);
    if (!plano) return null;
    return {
      numero: plano.numeroPE,
      plano,
    };
  };

  const handleOpenDialog = () => {
    setEditingItem(null);
    setFormData({
      quadrante: 'forcas',
      descricao: '',
      nivelRelevancia: 3,
      tomarAcao: false,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Análise SWOT
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Identifique forças, fraquezas, oportunidades e ameaças da organização.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog} className="gap-2 flex-shrink-0 ml-8">
              <Plus className="w-4 h-4" />
              Adicionar Item SWOT
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Item SWOT' : 'Adicionar Item SWOT'}</DialogTitle>
              <DialogDescription>
                Preencha as informações do item da análise SWOT.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Quadrante</Label>
                <Select
                  value={formData.quadrante}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, quadrante: value as SwotQuadrante }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUADRANTES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva o item..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Nível de Relevância</Label>
                <Select
                  value={formData.nivelRelevancia.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, nivelRelevancia: parseInt(value) as 1 | 2 | 3 }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NIVEIS_RELEVANCIA).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>Tomar Ação</Label>
                  <p className="text-sm text-gray-500">Marque se este item requer um plano de ação</p>
                </div>
                <Switch
                  checked={formData.tomarAcao}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, tomarAcao: checked }))}
                />
              </div>

              {formData.tomarAcao && (
                <div className="space-y-3">
                  <PlanoAcaoSelector
                    value={formData.planoAcaoVinculado || 'none'}
                    onChange={(value) => setFormData(prev => ({ ...prev, planoAcaoVinculado: value }))}
                  />
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="text-xs text-gray-500">ou</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                    onClick={() => setIsQuickPAEDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar PAE Agora e Vincular
                  </Button>
                </div>
              )}

              <Button onClick={handleSubmit} className="w-full">
                {editingItem ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* QuickPAEDialog */}
      <QuickPAEDialog
        open={isQuickPAEDialogOpen}
        onOpenChange={setIsQuickPAEDialogOpen}
        prefilledOrigem="SWOT"
        onSave={(plano) => {
          const newPAE = addPlanoAcao(plano);
          setFormData(prev => ({ ...prev, planoAcaoVinculado: newPAE.numeroPE }));
          toast.success(`PE ${newPAE.numeroPE} criado e vinculado!`);
        }}
      />

      {/* PAEDetailsDialog */}
      <PAEDetailsDialog
        open={isPAEDetailsDialogOpen}
        onOpenChange={setIsPAEDetailsDialogOpen}
        pae={selectedPAE}
      />

      {/* Resumo Estatístico - Movido para cima */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total de Itens"
          value={dados.swotItems.length}
          icon={BarChart3}
          variant="default"
        />
        <MetricCard
          label="Requerem Ação"
          value={dados.swotItems.filter(item => item.tomarAcao).length}
          icon={Zap}
          variant="purple"
        />
        <MetricCard
          label="Com Plano Vinculado"
          value={dados.swotItems.filter(item => item.planoAcaoVinculado).length}
          icon={ClipboardList}
          variant="info"
        />
        <MetricCard
          label="Alta Relevância"
          value={dados.swotItems.filter(item => item.nivelRelevancia === 3).length}
          icon={AlertCircle}
          variant="danger"
        />
      </div>

      {/* Barra de Distribuição de Relevância */}
      {dados.swotItems.length > 0 && (() => {
        const baixo = dados.swotItems.filter(item => getNivelRelevancia(item.nivelRelevancia) === 1).length;
        const medio = dados.swotItems.filter(item => getNivelRelevancia(item.nivelRelevancia) === 2).length;
        const alto = dados.swotItems.filter(item => getNivelRelevancia(item.nivelRelevancia) === 3).length;
        const total = dados.swotItems.length;
        
        const percBaixo = (baixo / total) * 100;
        const percMedio = (medio / total) * 100;
        const percAlto = (alto / total) * 100;

        return (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 bg-gray-100 rounded-full overflow-hidden flex shadow-inner" style={{ height: '10px' }}>
                {baixo > 0 && (
                  <div 
                    className="bg-gradient-to-r from-blue-100 to-blue-200 transition-all duration-500 relative group"
                    style={{ width: `${percBaixo}%` }}
                    title={`${baixo} item(ns) - Baixo`}
                  >
                    <div className="absolute inset-0 bg-blue-200 opacity-0 group-hover:opacity-60 transition-opacity"></div>
                  </div>
                )}
                {medio > 0 && (
                  <div 
                    className="bg-gradient-to-r from-yellow-100 to-yellow-200 transition-all duration-500 relative group"
                    style={{ width: `${percMedio}%` }}
                    title={`${medio} item(ns) - Médio`}
                  >
                    <div className="absolute inset-0 bg-yellow-200 opacity-0 group-hover:opacity-60 transition-opacity"></div>
                  </div>
                )}
                {alto > 0 && (
                  <div 
                    className="bg-gradient-to-r from-red-100 to-red-200 transition-all duration-500 relative group"
                    style={{ width: `${percAlto}%` }}
                    title={`${alto} item(ns) - Alto`}
                  >
                    <div className="absolute inset-0 bg-red-200 opacity-0 group-hover:opacity-60 transition-opacity"></div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 border border-blue-300"></div>
                <span className="text-gray-600">Baixo</span>
                <span className="text-blue-700" style={{ fontWeight: 600 }}>{baixo}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-100 to-yellow-200 border border-yellow-300"></div>
                <span className="text-gray-600">Médio</span>
                <span className="text-yellow-700" style={{ fontWeight: 600 }}>{medio}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-100 to-red-200 border border-red-300"></div>
                <span className="text-gray-600">Alto</span>
                <span className="text-red-700" style={{ fontWeight: 600 }}>{alto}</span>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-2 gap-6">
        {Object.entries(QUADRANTES).map(([quadrante, config]) => {
          const Icon = config.icon;
          const items = dados.swotItems.filter(item => item.quadrante === quadrante);

          return (
            <Card key={quadrante} className={`${config.color} border-2`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className={`w-6 h-6 ${config.iconColor}`} />
                  {config.label}
                </CardTitle>
                <CardDescription>{items.length} item(ns)</CardDescription>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    Nenhum item adicionado neste quadrante.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => {
                      const planoInfo = getPlanoAcaoInfo(item.planoAcaoVinculado);
                      const nivel = getNivelRelevancia(item.nivelRelevancia);
                      return (
                        <div
                          key={item.id}
                          className="p-3 bg-white rounded-xl border border-gray-200"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-start gap-2 flex-1">
                              <span className="font-bold text-blue-600 text-xs shrink-0">{item.numeroSwot}</span>
                              <p className="text-sm flex-1">{item.descricao}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge className={NIVEIS_RELEVANCIA[nivel].color}>
                              {NIVEIS_RELEVANCIA[nivel].label}
                            </Badge>
                            {item.tomarAcao && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                Requer Ação
                              </Badge>
                            )}
                            {planoInfo && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedPAE(planoInfo.plano);
                                  setIsPAEDetailsDialogOpen(true);
                                }}
                              >
                                <LinkIcon className="w-3 h-3 mr-1" />
                                {planoInfo.numero}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}