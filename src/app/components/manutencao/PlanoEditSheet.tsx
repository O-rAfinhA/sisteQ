/**
 * PlanoEditSheet — Sheet de edição de plano reutilizável.
 * Usado em PlanoManutencao (lista) e AgendaManutencao (consulta direta).
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Plus, Save, X } from 'lucide-react';
import { dataHojeISO } from '../../utils/formatters';
import { generateId } from '../../utils/helpers';
import {
  useManutencao,
  PERIODICIDADE_CONFIG,
  type PlanoManutencao, type PeriodicidadePlano, type StatusPlano, type ItemVerificacao,
} from '../../hooks/useManutencao';

interface Props {
  plano: PlanoManutencao;
  onClose: () => void;
  /** setPlanos do componente pai — garante que o estado do parent seja atualizado ao salvar */
  setPlanosPai?: React.Dispatch<React.SetStateAction<PlanoManutencao[]>>;
}

const ITEM_VAZIO = { descricao: '', periodicidade: 'mensal' as PeriodicidadePlano };

function formFromPlano(p: PlanoManutencao) {
  return {
    equipamentoId: p.equipamentoId,
    descricao: p.descricao || '',
    dataInicio: p.dataInicio || dataHojeISO(),
    duracaoEstimada: p.duracaoEstimada != null ? String(p.duracaoEstimada) : '',
    necessitaParada: p.necessitaParada || false,
    responsavel: p.responsavel || '',
    status: p.status,
    observacoes: p.observacoes || '',
    itensVerificacao: (p.itensVerificacao || []).map(i => ({ ...i })),
  };
}

export function PlanoEditSheet({ plano, onClose, setPlanosPai }: Props) {
  const { setPlanos, equipamentos, planos: todosPlanos } = useManutencao();
  const eqAtivos = equipamentos.filter(e => e.ativo);

  const [formData, setFormData] = useState(() => {
    // Prioriza a versão mais recente do localStorage (hook próprio) em vez do prop
    // — evita inicializar com snapshot desatualizado do estado do parent
    const planoAtual = todosPlanos.find(p => p.id === plano.id) ?? plano;
    return formFromPlano(planoAtual);
  });
  const [novoItem, setNovoItem] = useState({ ...ITEM_VAZIO });

  function adicionarItem() {
    if (!novoItem.descricao.trim()) { toast.error('Informe a descrição do item.'); return; }
    const item: ItemVerificacao = {
      id: generateId('iv-'),
      descricao: novoItem.descricao.trim(),
      periodicidade: novoItem.periodicidade,
    };
    setFormData(p => ({ ...p, itensVerificacao: [...p.itensVerificacao, item] }));
    setNovoItem({ ...ITEM_VAZIO });
  }

  function removerItem(id: string) {
    setFormData(p => ({ ...p, itensVerificacao: p.itensVerificacao.filter(i => i.id !== id) }));
  }

  function handleSave() {
    if (!formData.equipamentoId) { toast.error('Selecione o equipamento.'); return; }
    if (!formData.dataInicio) { toast.error('Informe a data de início.'); return; }
    if (formData.itensVerificacao.length === 0) { toast.error('Adicione ao menos um item de verificação.'); return; }

    const eq = eqAtivos.find(e => e.id === formData.equipamentoId);
    const nomeDerivado = eq ? eq.nome : plano.nome;

    const atualizarPlanos = (prev: PlanoManutencao[]) =>
      prev.map(p => {
        if (p.id !== plano.id) return p;
        return {
          ...p,
          nome: nomeDerivado,
          equipamentoId: formData.equipamentoId,
          descricao: formData.descricao.trim() || undefined,
          dataInicio: formData.dataInicio,
          duracaoEstimada: formData.duracaoEstimada ? parseFloat(formData.duracaoEstimada) : undefined,
          necessitaParada: formData.necessitaParada,
          responsavel: formData.responsavel.trim(),
          status: formData.status,
          observacoes: formData.observacoes.trim() || undefined,
          itensVerificacao: formData.itensVerificacao,
          dataAtualizacao: dataHojeISO(),
        };
      });

    // Atualiza estado próprio (persiste no localStorage via useEffect do hook)
    setPlanos(atualizarPlanos);
    // Atualiza estado do parent (se fornecido) para manter sincronia em memória
    if (setPlanosPai) setPlanosPai(atualizarPlanos);

    toast.success(`Plano ${plano.codigo} atualizado.`);
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto p-0">
        <DialogHeader className="pb-4 pt-6 px-6">
          <DialogTitle>Editar Plano — {plano.codigo}</DialogTitle>
          <DialogDescription>
            Edite as configurações do plano. Os itens de verificação e periodicidades podem ser ajustados abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pb-10 px-6">

          {/* Equipamento */}
          <div>
            <Label className="text-xs text-gray-600">Equipamento *</Label>
            <p className="text-[11px] text-gray-400 mt-0.5 mb-1">O nome do plano será o nome do equipamento selecionado.</p>
            <Select value={formData.equipamentoId} onValueChange={v => setFormData(p => ({ ...p, equipamentoId: v }))}>
              <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
              <SelectContent>
                {eqAtivos.map(e => <SelectItem key={e.id} value={e.id}>{e.codigo} — {e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            {formData.equipamentoId && (() => {
              const eq = eqAtivos.find(e => e.id === formData.equipamentoId);
              return eq ? (
                <p className="text-xs text-blue-600 mt-1.5 pl-1">
                  Nome do plano: <span style={{ fontWeight: 600 }}>{eq.nome}</span>
                </p>
              ) : null;
            })()}
          </div>

          {/* Descrição */}
          <div>
            <Label className="text-xs text-gray-600">Descrição / Objetivo do Plano</Label>
            <Input
              value={formData.descricao}
              onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))}
              placeholder="Objetivo geral deste plano preventivo..."
              className="mt-1 text-sm"
            />
          </div>

          {/* Data de início + Duração + Parada */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-gray-600">Data de Início *</Label>
              <Input
                type="date"
                value={formData.dataInicio}
                onChange={e => setFormData(p => ({ ...p, dataInicio: e.target.value }))}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Duração Est. (h)</Label>
              <Input
                type="number" min="0" step="0.5"
                value={formData.duracaoEstimada}
                onChange={e => setFormData(p => ({ ...p, duracaoEstimada: e.target.value }))}
                placeholder="ex: 2.5"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Necessita Parada?</Label>
              <Select value={formData.necessitaParada ? 'sim' : 'nao'} onValueChange={v => setFormData(p => ({ ...p, necessitaParada: v === 'sim' }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Responsável + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-600">Responsável</Label>
              <Input
                value={formData.responsavel}
                onChange={e => setFormData(p => ({ ...p, responsavel: e.target.value }))}
                placeholder="Nome do técnico"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v as StatusPlano }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Itens de verificação */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-gray-600" style={{ fontWeight: 600 }}>
                Itens de Verificação *
              </Label>
              <span className="text-[10px] text-gray-400">{formData.itensVerificacao.length} item(s)</span>
            </div>

            {formData.itensVerificacao.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center mb-3">
                <p className="text-xs text-gray-400">Nenhum item. Adicione abaixo.</p>
              </div>
            ) : (
              <div className="space-y-1.5 mb-3">
                {formData.itensVerificacao.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 group">
                    <span className="text-xs text-gray-400 w-5 shrink-0 text-right">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-800 block truncate">{item.descricao}</span>
                      <span className="text-xs text-blue-600">{PERIODICIDADE_CONFIG[item.periodicidade].label}</span>
                    </div>
                    <Button
                      variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={() => removerItem(item.id)}
                    >
                      <X className="w-3 h-3 text-gray-400" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Adicionar item */}
            <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
              <p className="text-xs text-gray-500" style={{ fontWeight: 600 }}>Adicionar item</p>
              <Input
                value={novoItem.descricao}
                onChange={e => setNovoItem(p => ({ ...p, descricao: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarItem(); } }}
                placeholder="Descrição do item de verificação..."
                className="text-sm"
              />
              <div className="flex gap-2">
                <Select value={novoItem.periodicidade} onValueChange={v => setNovoItem(p => ({ ...p, periodicidade: v as PeriodicidadePlano }))}>
                  <SelectTrigger className="text-sm flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(PERIODICIDADE_CONFIG) as [PeriodicidadePlano, { label: string }][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={adicionarItem} className="gap-1.5 shrink-0">
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label className="text-xs text-gray-600">Observações</Label>
            <Input
              value={formData.observacoes}
              onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
              placeholder="Informações adicionais..."
              className="mt-1 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} variant="black" className="gap-2">
              <Save className="w-4 h-4" /> Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
