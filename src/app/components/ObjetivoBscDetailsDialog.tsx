import { ObjetivoBscItem, PoliticaBscItem } from '../types/strategic';
import { useStrategic } from '../context/StrategicContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Target, ExternalLink, Briefcase, Users, Cog, TrendingUp, Edit } from 'lucide-react';
import { formatarData } from '../utils/formatters';
import { useState } from 'react';
import { PAEDetailsDialog } from './PAEDetailsDialog';
import { ObjetivoDialog } from './ObjetivoDialog';

interface ObjetivoBscDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objetivo: ObjetivoBscItem | null;
}

const PERSPECTIVAS_BSC = {
  financeira: { 
    label: 'Financeira', 
    color: 'bg-green-50 border-green-200 text-green-700',
    icon: TrendingUp,
    iconColor: 'text-green-600'
  },
  clientes: { 
    label: 'Clientes', 
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    icon: Users,
    iconColor: 'text-blue-600'
  },
  processos: { 
    label: 'Processos', 
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    icon: Cog,
    iconColor: 'text-purple-600'
  },
  aprendizado: { 
    label: 'Aprendizado', 
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    icon: Briefcase,
    iconColor: 'text-orange-600'
  },
};

export function ObjetivoBscDetailsDialog({ open, onOpenChange, objetivo }: ObjetivoBscDetailsDialogProps) {
  const { dados, updateObjetivoBsc } = useStrategic();
  const [isPAEDialogOpen, setIsPAEDialogOpen] = useState(false);
  const [selectedPAE, setSelectedPAE] = useState<any>(null);
  const [isObjetivoDialogOpen, setIsObjetivoDialogOpen] = useState(false);

  if (!objetivo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
            <DialogDescription>Aguarde enquanto carregamos os detalhes do objetivo.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const perspectiva = PERSPECTIVAS_BSC[objetivo.perspectiva];
  const Icon = perspectiva.icon;

  const planoVinculado = objetivo.planoAcaoVinculado 
    ? dados.planosAcao.find(p => p.numeroPE === objetivo.planoAcaoVinculado)
    : null;

  const politicaVinculada = objetivo.politicaVinculadaId
    ? dados.direcionamento.politicaBsc.find(p => p.id === objetivo.politicaVinculadaId)
    : null;
  
  const politicasDaPerspectiva = dados.direcionamento.politicaBsc.filter(
    p => p.perspectiva === objetivo.perspectiva
  );

  const handleOpenPAE = () => {
    if (planoVinculado) {
      setSelectedPAE(planoVinculado);
      setIsPAEDialogOpen(true);
    }
  };

  const handleOpenObjetivo = () => {
    setIsObjetivoDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Target className="w-6 h-6 text-blue-600" />
                  {objetivo.numeroObjetivo}
                </DialogTitle>
                <DialogDescription className="mt-2">
                  Detalhes do Objetivo Estratégico
                </DialogDescription>
              </div>
              <Badge className={perspectiva.color}>
                <Icon className={`w-3 h-3 mr-1 ${perspectiva.iconColor}`} />
                {perspectiva.label}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Descrição */}
            <div>
              <Label className="text-base font-semibold">Descrição do Objetivo</Label>
              <p className="mt-2 text-gray-600 text-sm whitespace-pre-wrap">{objetivo.descricao}</p>
            </div>

            {/* Indicador e Metas */}
            <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm text-gray-600">Indicador do Projeto</Label>
                <p className="mt-1 font-medium text-sm">{objetivo.indicadorProjeto}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Resultado Atual</Label>
                  <p className="mt-1 font-medium">{objetivo.resultadoAtual}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Meta</Label>
                  <p className="mt-1 font-medium">{objetivo.meta}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Prazo de Início</Label>
                  <p className="mt-1 font-medium">{objetivo.prazoInicio ? formatarData(objetivo.prazoInicio) : '-'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Prazo de Conclusão</Label>
                  <p className="mt-1 font-medium">{objetivo.prazo ? formatarData(objetivo.prazo) : '-'}</p>
                </div>
              </div>
            </div>

            {/* Política Vinculada */}
            {politicaVinculada && (
              <div className="border-t pt-6">
                <Label className="text-base font-semibold">Política BSC Vinculada</Label>
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-700">{politicaVinculada.descricao}</p>
                  <Badge className="mt-2 text-xs">
                    {PERSPECTIVAS_BSC[politicaVinculada.perspectiva].label}
                  </Badge>
                </div>
              </div>
            )}

            {/* Plano de Ação Vinculado */}
            {planoVinculado && (
              <div className="border-t pt-6">
                <Label className="text-base font-semibold">Plano de Ação Vinculado</Label>
                <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-900">{planoVinculado.numeroPAE}</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{planoVinculado.acao}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="text-xs">
                          {planoVinculado.origemTipo}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Prazo: {formatarData(planoVinculado.prazoFinal)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700"
                      onClick={handleOpenPAE}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-4 border-t">
              <ObjetivoDialog
                mode="edit"
                perspectiva={objetivo.perspectiva}
                perspectivaLabel={perspectiva.label}
                politicas={politicasDaPerspectiva}
                objetivo={objetivo}
                onSave={(updates) => {
                  updateObjetivoBsc(objetivo.id, updates);
                  onOpenChange(false);
                }}
                trigger={
                  <Button variant="outline" className="flex-1">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                }
              />
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog do PAE */}
      <PAEDetailsDialog
        open={isPAEDialogOpen}
        onOpenChange={setIsPAEDialogOpen}
        pae={selectedPAE}
      />
    </>
  );
}