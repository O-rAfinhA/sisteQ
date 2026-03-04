import { SwotItem } from '../types/strategic';
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
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, ExternalLink, Edit } from 'lucide-react';
import { formatarData } from '../utils/formatters';
import { useState } from 'react';
import { PAEDetailsDialog } from './PAEDetailsDialog';
import { useNavigate } from 'react-router';
import { ROUTES } from '../config/routes';

interface SwotItemDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SwotItem | null;
}

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

const getNivelRelevancia = (nivel: any): 1 | 2 | 3 => {
  const n = Number(nivel);
  if (n <= 1 || isNaN(n)) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  if (n >= 4) return 3;
  return 2;
};

export function SwotItemDetailsDialog({ open, onOpenChange, item }: SwotItemDetailsDialogProps) {
  const { dados } = useStrategic();
  const [isPAEDialogOpen, setIsPAEDialogOpen] = useState(false);
  const [selectedPAE, setSelectedPAE] = useState<any>(null);
  const navigate = useNavigate();

  if (!item) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
            <DialogDescription>Aguarde enquanto carregamos os detalhes do item SWOT.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const quadrante = QUADRANTES[item.quadrante];
  const Icon = quadrante.icon;
  const nivel = getNivelRelevancia(item.nivelRelevancia);

  const planoVinculado = item.planoAcaoVinculado 
    ? dados.planosAcao.find(p => p.numeroPAE === item.planoAcaoVinculado)
    : null;

  const handleOpenPAE = () => {
    if (planoVinculado) {
      setSelectedPAE(planoVinculado);
      setIsPAEDialogOpen(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Icon className={`w-6 h-6 ${quadrante.iconColor}`} />
                  {item.numeroSwot}
                </DialogTitle>
                <DialogDescription className="mt-2">
                  Detalhes do Item SWOT
                </DialogDescription>
              </div>
              <Badge className={quadrante.color}>
                {quadrante.label}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Descrição */}
            <div>
              <Label className="text-base font-semibold">Descrição</Label>
              <p className="mt-2 text-gray-600 text-sm whitespace-pre-wrap">{item.descricao}</p>
            </div>

            {/* Informações */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm text-gray-600">Nível de Relevância</Label>
                <div className="mt-2">
                  <Badge className={NIVEIS_RELEVANCIA[nivel].color}>
                    {NIVEIS_RELEVANCIA[nivel].label}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Requer Ação</Label>
                <div className="mt-2">
                  <Badge variant="outline" className={item.tomarAcao ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-600 border-gray-200'}>
                    {item.tomarAcao ? 'Sim' : 'Não'}
                  </Badge>
                </div>
              </div>
              <div className="col-span-2">
                <Label className="text-sm text-gray-600">Criado em</Label>
                <p className="mt-1 font-medium">{formatarData(item.criadoEm)}</p>
              </div>
            </div>

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
              <Button 
                variant="outline" 
                onClick={() => {
                  onOpenChange(false);
                  navigate(ROUTES.GESTAO_ESTRATEGICA.SWOT);
                }}
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
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