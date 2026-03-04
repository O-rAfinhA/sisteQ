/**
 * Manutenção / Equipamentos
 * Cadastro e gerenciamento de equipamentos
 */
import { useState, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { HardHat, Plus, Edit2, Trash2, Search, Save, Power, Wrench } from 'lucide-react';
import { dataHojeISO } from '../../utils/formatters';
import { generateId } from '../../utils/helpers';
import { useManutencao, gerarCodigoEquipamento, type Equipamento } from '../../hooks/useManutencao';

const FORM_VAZIO = {
  codigo: '', nome: '', tipo: '', localizacao: '', fabricante: '',
  modelo: '', numSerie: '', responsavel: '', departamento: '', observacoes: '', ativo: true,
};

export function ManutencaoEquipamentos() {
  const { equipamentos, setEquipamentos, ordens, tiposEquipamento } = useManutencao();
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...FORM_VAZIO });

  const filtrados = useMemo(() => {
    return equipamentos.filter(eq => {
      const matchBusca = !busca || [eq.codigo, eq.nome, eq.tipo, eq.localizacao, eq.fabricante].some(v =>
        v?.toLowerCase().includes(busca.toLowerCase())
      );
      const matchAtivo = filtroAtivo === 'todos' || (filtroAtivo === 'ativo' ? eq.ativo : !eq.ativo);
      return matchBusca && matchAtivo;
    }).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [equipamentos, busca, filtroAtivo]);

  function handleOpenNew() {
    setEditingId(null);
    const codigo = gerarCodigoEquipamento(equipamentos);
    setFormData({ ...FORM_VAZIO, codigo });
    setIsFormOpen(true);
  }

  function handleOpenEdit(eq: Equipamento) {
    setEditingId(eq.id);
    setFormData({
      codigo: eq.codigo, nome: eq.nome, tipo: eq.tipo,
      localizacao: eq.localizacao, fabricante: eq.fabricante,
      modelo: eq.modelo, numSerie: eq.numSerie,
      responsavel: eq.responsavel, departamento: eq.departamento,
      observacoes: eq.observacoes || '', ativo: eq.ativo,
    });
    setIsFormOpen(true);
  }

  function handleSave() {
    if (!formData.nome.trim()) { toast.error('Informe o nome do equipamento.'); return; }
    if (!formData.tipo) { toast.error('Selecione o tipo de equipamento.'); return; }
    const agora = dataHojeISO();
    if (editingId) {
      setEquipamentos(prev => prev.map(e => e.id === editingId ? {
        ...e, nome: formData.nome.trim(), tipo: formData.tipo,
        localizacao: formData.localizacao.trim(), fabricante: formData.fabricante.trim(),
        modelo: formData.modelo.trim(), numSerie: formData.numSerie.trim(),
        responsavel: formData.responsavel.trim(), departamento: formData.departamento.trim(),
        observacoes: formData.observacoes.trim(), ativo: formData.ativo, dataAtualizacao: agora,
      } : e));
      toast.success('Equipamento atualizado.');
    } else {
      const novo: Equipamento = {
        id: generateId('eq-'), codigo: formData.codigo,
        nome: formData.nome.trim(), tipo: formData.tipo,
        localizacao: formData.localizacao.trim(), fabricante: formData.fabricante.trim(),
        modelo: formData.modelo.trim(), numSerie: formData.numSerie.trim(),
        responsavel: formData.responsavel.trim(), departamento: formData.departamento.trim(),
        observacoes: formData.observacoes.trim(), ativo: formData.ativo,
        dataCriacao: agora, dataAtualizacao: agora,
      };
      setEquipamentos(prev => [...prev, novo]);
      toast.success('Equipamento cadastrado.');
    }
    setIsFormOpen(false);
  }

  function handleDelete() {
    if (!deleteId) return;
    const emUso = ordens.some(o => o.equipamentoId === deleteId);
    if (emUso) { toast.error('Equipamento vinculado a OS existentes — não pode ser excluído.'); setDeleteId(null); return; }
    setEquipamentos(prev => prev.filter(e => e.id !== deleteId));
    setDeleteId(null);
    toast.success('Equipamento excluído.');
  }

  function toggleAtivo(eq: Equipamento) {
    setEquipamentos(prev => prev.map(e => e.id === eq.id ? { ...e, ativo: !e.ativo, dataAtualizacao: dataHojeISO() } : e));
    toast.success(eq.ativo ? 'Equipamento desativado.' : 'Equipamento ativado.');
  }

  const field = (label: string, key: keyof typeof formData, placeholder = '') => (
    <div>
      <Label className="text-xs text-gray-600">{label}</Label>
      <Input
        value={String(formData[key])}
        onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="mt-1 text-sm"
      />
    </div>
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border border-blue-100 bg-blue-50 text-blue-600" style={{ fontWeight: 600 }}>
                <Wrench style={{ width: 11, height: 11 }} />
                MANUTENÇÃO
              </div>
            </div>
            <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
              Equipamentos
            </h1>
            <p className="text-gray-500 mt-1 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Cadastro e controle de todos os equipamentos sujeitos à manutenção.
            </p>
          </div>
          <Button onClick={handleOpenNew} className="gap-2 flex-shrink-0"><Plus className="w-4 h-4" /> Novo Equipamento</Button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Total', value: equipamentos.length, color: 'text-gray-800' },
            { label: 'Ativos', value: equipamentos.filter(e => e.ativo).length, color: 'text-emerald-600' },
            { label: 'Inativos', value: equipamentos.filter(e => !e.ativo).length, color: 'text-gray-400' },
            { label: 'Com OS registradas', value: equipamentos.filter(eq => ordens.some(o => o.equipamentoId === eq.id)).length, color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide" style={{ fontWeight: 600 }}>{s.label}</p>
              <p className={`mt-0.5 ${s.color}`} style={{ fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.2 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Barra de ações */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar equipamento..." className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-2">
          <Select value={filtroAtivo} onValueChange={setFiltroAtivo}>
            <SelectTrigger className="h-9 text-xs w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-200">
                {['Código', 'Nome', 'Tipo', 'Localização', 'Responsável', 'OS Totais', 'Situação', 'Ações'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs text-gray-500 ${h === 'Ações' || h === 'OS Totais' || h === 'Situação' ? 'text-center' : 'text-left'}`} style={{ fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center">
                  <HardHat className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Nenhum equipamento encontrado.</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={handleOpenNew}><Plus className="w-4 h-4" /> Cadastrar</Button>
                </td></tr>
              )}
              {filtrados.map(eq => {
                const totalOS = ordens.filter(o => o.equipamentoId === eq.id).length;
                return (
                  <tr key={eq.id} className={`hover:bg-gray-50/50 transition-colors ${!eq.ativo ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3"><span className="text-sm text-gray-900 font-mono" style={{ fontWeight: 600 }}>{eq.codigo}</span></td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-800" style={{ fontWeight: 500 }}>{eq.nome}</span>
                      {eq.modelo && <span className="text-xs text-gray-400 block">{eq.fabricante} {eq.modelo}</span>}
                    </td>
                    <td className="px-4 py-3"><span className="text-sm text-gray-600">{eq.tipo}</span></td>
                    <td className="px-4 py-3"><span className="text-sm text-gray-600">{eq.localizacao || '—'}</span></td>
                    <td className="px-4 py-3"><span className="text-sm text-gray-600">{eq.responsavel || '—'}</span></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm ${totalOS > 0 ? 'text-gray-700' : 'text-gray-400'}`} style={{ fontWeight: totalOS > 0 ? 600 : 400 }}>{totalOS}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${eq.ativo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`} style={{ fontWeight: 500 }}>
                        {eq.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title={eq.ativo ? 'Desativar' : 'Ativar'} onClick={() => toggleAtivo(eq)}>
                          <Power className="w-3.5 h-3.5 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenEdit(eq)}>
                          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteId(eq.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtrados.length > 0 && (
          <div className="px-4 py-2.5 bg-gray-50/40 border-t border-gray-100">
            <span className="text-xs text-gray-400">{filtrados.length} equipamento(s) exibido(s)</span>
          </div>
        )}
      </div>

      {/* Form Sheet */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="w-full sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto p-0">
          <DialogHeader className="pb-4 px-6 pt-6">
            <DialogTitle>{editingId ? 'Editar Equipamento' : 'Novo Equipamento'}</DialogTitle>
            <DialogDescription>Dados de identificação e localização do equipamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pb-8 px-6">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Código</Label>
                <Input value={formData.codigo} readOnly className="mt-1 text-sm bg-gray-50 text-gray-500 w-24" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-gray-600">Nome *</Label>
                <Input value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} placeholder="Nome do equipamento" className="mt-1 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Tipo *</Label>
              <Select value={formData.tipo} onValueChange={v => setFormData(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {tiposEquipamento.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {field('Localização', 'localizacao', 'ex: Linha A — Setor Produção')}
            <div className="grid grid-cols-2 gap-3">
              {field('Fabricante', 'fabricante', 'ex: Schuler')}
              {field('Modelo', 'modelo', 'ex: HPS 250')}
            </div>
            {field('Número de Série', 'numSerie', 'ex: SN-2024-001')}
            <div className="grid grid-cols-2 gap-3">
              {field('Responsável', 'responsavel', 'Nome do técnico')}
              {field('Departamento', 'departamento', 'ex: Produção')}
            </div>
            {field('Observações', 'observacoes', 'Informações adicionais...')}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="gap-2"><Save className="w-4 h-4" /> Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Equipamento</AlertDialogTitle>
            <AlertDialogDescription>Equipamentos com OS registradas não podem ser excluídos. Esta ação é irreversível.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
