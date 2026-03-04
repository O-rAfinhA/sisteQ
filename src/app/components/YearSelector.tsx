import { useState } from 'react';
import { useStrategic } from '../context/StrategicContext';
import { Calendar, ChevronDown, Plus, Copy, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Label } from './ui/label';

export function YearSelector() {
  const { anoAtual, anosDisponiveis, selecionarAno, criarAnoEmBranco, copiarAno, removerAno } = useStrategic();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [anoParaExcluir, setAnoParaExcluir] = useState('');
  const [novoAno, setNovoAno] = useState('');
  const [anoParaCopiar, setAnoParaCopiar] = useState('');

  const handleCriarAnoEmBranco = () => {
    const ano = novoAno.trim();
    if (!ano) {
      toast.error('Digite um ano válido');
      return;
    }

    if (!/^\d{4}$/.test(ano)) {
      toast.error('O ano deve ter 4 dígitos');
      return;
    }

    try {
      criarAnoEmBranco(ano);
      toast.success(`Ano ${ano} criado com sucesso!`);
      setShowCreateDialog(false);
      setNovoAno('');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar ano');
    }
  };

  const handleCopiarAno = () => {
    const ano = novoAno.trim();
    if (!ano) {
      toast.error('Digite um ano válido');
      return;
    }

    if (!/^\d{4}$/.test(ano)) {
      toast.error('O ano deve ter 4 dígitos');
      return;
    }

    if (!anoParaCopiar) {
      toast.error('Selecione um ano para copiar');
      return;
    }

    try {
      copiarAno(anoParaCopiar, ano);
      toast.success(`Dados de ${anoParaCopiar} copiados para ${ano}!`);
      setShowCopyDialog(false);
      setNovoAno('');
      setAnoParaCopiar('');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao copiar ano');
    }
  };

  const handleConfirmarExclusao = () => {
    try {
      removerAno(anoParaExcluir);
      toast.success(`Ano ${anoParaExcluir} excluído com sucesso!`);
      setShowDeleteAlert(false);
      setAnoParaExcluir('');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir ano');
    }
  };

  const iniciarExclusao = (ano: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnoParaExcluir(ano);
    setShowDeleteAlert(true);
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 min-w-[140px]">
            <Calendar className="w-4 h-4" />
            {anoAtual}
            <ChevronDown className="w-4 h-4 ml-auto" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px]">
          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
            ANOS DISPONÍVEIS
          </div>
          {anosDisponiveis.map((ano) => (
            <DropdownMenuItem
              key={ano}
              onClick={() => selecionarAno(ano)}
              className="flex items-center justify-between group"
            >
              <span>{ano}</span>
              <div className="flex items-center gap-2">
                {ano === anoAtual && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Atual
                  </span>
                )}
                {anosDisponiveis.length > 1 && (
                  <button
                    onClick={(e) => iniciarExclusao(ano, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-opacity"
                    title="Excluir ano"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar ano em branco
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowCopyDialog(true)}>
            <Copy className="w-4 h-4 mr-2" />
            Copiar de outro ano
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog para criar ano em branco */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Ano em Branco</DialogTitle>
            <DialogDescription>
              Crie um novo ano de planejamento sem dados preenchidos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Ano *</Label>
              <Input
                type="text"
                placeholder="Ex: 2027"
                value={novoAno}
                onChange={(e) => setNovoAno(e.target.value)}
                maxLength={4}
              />
            </div>
            <Button onClick={handleCriarAnoEmBranco} className="w-full">
              Criar Ano
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para copiar de outro ano */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiar de Outro Ano</DialogTitle>
            <DialogDescription>
              Copie todos os dados de um ano existente para um novo ano.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Copiar dados de *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={anoParaCopiar}
                onChange={(e) => setAnoParaCopiar(e.target.value)}
              >
                <option value="">Selecione um ano</option>
                {anosDisponiveis.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Para o ano *</Label>
              <Input
                type="text"
                placeholder="Ex: 2027"
                value={novoAno}
                onChange={(e) => setNovoAno(e.target.value)}
                maxLength={4}
              />
            </div>
            <Button onClick={handleCopiarAno} className="w-full">
              Copiar Dados
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para confirmar exclusão */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o ano <strong>{anoParaExcluir}</strong>?
              <br />
              <br />
              Todos os dados deste ano serão permanentemente excluídos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir Ano
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
