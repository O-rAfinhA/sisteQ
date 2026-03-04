/**
 * Tipos de Instrumentos — Biblioteca de Tipos com Tolerâncias Predefinidas
 * Define tipos de instrumentos (paquímetro, micrômetro, etc.) com capacidades e tolerâncias
 * Exceção visual: código exibido como badge secundário (não é identificação de instrumento, é de categoria)
 */
import React, { useState, useMemo, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { AlertCircle, Plus, Edit2, Trash2, Search, Ruler, Save, MapPin } from 'lucide-react';
import { dataHojeISO } from '../utils/formatters';
import { generateId } from '../utils/helpers';
import {
  useInstrumentos,
  type TipoInstrumento,
} from '../hooks/useInstrumentos';

// ═══ Helper: próximo código sequencial global — formato IM001, IM002… ═══
function gerarProximoCodigo(existentes: TipoInstrumento[]): string {
  const prefix = 'IM';
  let n = 1;
  while (existentes.some(t => t.codigo === `${prefix}${String(n).padStart(3, '0')}`)) {
    n++;
  }
  return `${prefix}${String(n).padStart(3, '0')}`;
}

export default function TiposInstrumentos() {
  const { tiposInstrumentos, setTiposInstrumentos, instrumentos } = useInstrumentos();

  const [busca, setBusca] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoInstrumento | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [liveFormErrors, setLiveFormErrors] = useState<{
    codigo?: string;
    descricao?: string;
    tolerancia?: string;
  }>({});

  // Flag: indica se o usuário editou manualmente o código (evita sobrescrever após edição manual)
  const codigoManualRef = useRef(false);

  // Form state
  const [formData, setFormData] = useState(() => createEmptyTipo());

  function createEmptyTipo() {
    return {
      codigo: '',
      descricao: '',
      capacidade: '',
      tolerancia: '',
      unidade: '',
      localUso: '',
      observacoes: '',
    };
  }

  const filtrados = useMemo(() => {
    return tiposInstrumentos.filter(tipo => {
      const matchBusca = !busca ||
        tipo.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        tipo.descricao.toLowerCase().includes(busca.toLowerCase()) ||
        tipo.capacidade.toLowerCase().includes(busca.toLowerCase()) ||
        (tipo.localUso || '').toLowerCase().includes(busca.toLowerCase());
      return matchBusca;
    }).sort((a, b) => a.descricao.localeCompare(b.descricao));
  }, [tiposInstrumentos, busca]);

  // Contar quantos instrumentos usam cada tipo
  const contagemUso = useMemo(() => {
    const counts: Record<string, number> = {};
    instrumentos.forEach(inst => {
      if (inst.tipoInstrumentoId) {
        counts[inst.tipoInstrumentoId] = (counts[inst.tipoInstrumentoId] || 0) + 1;
      }
    });
    return counts;
  }, [instrumentos]);

  function handleOpenNew() {
    setEditingTipo(null);
    codigoManualRef.current = false;
    setLiveFormErrors({});
    setFormData({
      ...createEmptyTipo(),
      codigo: gerarProximoCodigo(tiposInstrumentos),
    });
    setIsFormOpen(true);
  }

  function handleOpenEdit(tipo: TipoInstrumento) {
    setEditingTipo(tipo);
    codigoManualRef.current = true; // ao editar, não sobrescreve o código existente
    setLiveFormErrors({});
    setFormData({
      codigo: tipo.codigo,
      descricao: tipo.descricao,
      capacidade: tipo.capacidade,
      tolerancia: tipo.tolerancia,
      unidade: tipo.unidade,
      localUso: tipo.localUso || '',
      observacoes: tipo.observacoes || '',
    });
    setIsFormOpen(true);
  }

  // Atualiza descrição sem mexer no código (código é sequencial, gerado na abertura do form)
  function handleDescricaoChange(valor: string) {
    setFormData(prev => ({ ...prev, descricao: valor }));
    if (liveFormErrors.descricao) setLiveFormErrors(prev => ({ ...prev, descricao: undefined }));
  }

  function handleCodigoChange(valor: string) {
    codigoManualRef.current = true;
    setFormData(prev => ({ ...prev, codigo: valor }));
    if (liveFormErrors.codigo) setLiveFormErrors(prev => ({ ...prev, codigo: undefined }));
  }

  function handleSave() {
    const errors: {
      codigo?: string;
      descricao?: string;
      tolerancia?: string;
    } = {};

    if (!formData.descricao.trim()) errors.descricao = 'Informe a descrição do tipo.';
    if (!formData.tolerancia.trim()) errors.tolerancia = 'Informe a tolerância padrão.';

    // Garante código gerado se ainda estiver vazio
    const codigoFinal = formData.codigo.trim() ||
      gerarProximoCodigo(tiposInstrumentos);

    if (!codigoFinal) errors.codigo = 'Não foi possível gerar o código.';

    const duplicado = tiposInstrumentos.find(t => t.codigo === codigoFinal && t.id !== editingTipo?.id);
    if (duplicado) errors.codigo = 'Código já utilizado por outro tipo.';

    if (Object.keys(errors).length > 0) {
      setLiveFormErrors(errors);
      toast.error('Revise os campos obrigatórios.');
      return;
    }

    const agora = dataHojeISO();
    if (editingTipo) {
      setTiposInstrumentos(prev => prev.map(t => t.id === editingTipo.id ? {
        ...t,
        ...formData,
        codigo: codigoFinal,
        dataAtualizacao: agora,
      } : t));
      toast.success('Tipo de instrumento atualizado com sucesso.');
    } else {
      const novo: TipoInstrumento = {
        id: generateId('tipo-'),
        ...formData,
        codigo: codigoFinal,
        dataCriacao: agora,
        dataAtualizacao: agora,
      };
      setTiposInstrumentos(prev => [...prev, novo]);
      toast.success('Tipo de instrumento cadastrado com sucesso.');
    }
    setIsFormOpen(false);
  }

  function handleFormOpenChange(open: boolean) {
    setIsFormOpen(open);
    if (!open) setLiveFormErrors({});
  }

  function handleDelete() {
    if (!deleteId) return;
    const countUso = contagemUso[deleteId] || 0;
    if (countUso > 0) {
      toast.error(`Este tipo está vinculado a ${countUso} instrumento(s). Não é possível excluir.`);
      setDeleteId(null);
      return;
    }
    setTiposInstrumentos(prev => prev.filter(t => t.id !== deleteId));
    setDeleteId(null);
    toast.success('Tipo de instrumento excluído.');
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Tipos de Instrumentos
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Biblioteca de categorias de instrumentos com capacidades e tolerâncias predefinidas.
          </p>
        </div>
      </div>

      {/* Barra de ações */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por descrição, capacidade ou local de uso..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Button onClick={handleOpenNew} className="gap-2 h-9">
          <Plus className="w-4 h-4" /> Novo Tipo
        </Button>
      </div>

      {/* Cards de Tipos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.length === 0 && (
          <div className="col-span-full">
            <Card className="border-gray-200 rounded-xl">
              <CardContent className="p-12 text-center">
                <Ruler className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Nenhum tipo de instrumento encontrado.</p>
                <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={handleOpenNew}>
                  <Plus className="w-4 h-4" /> Cadastrar Tipo
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {filtrados.map(tipo => {
          const emUso = contagemUso[tipo.id] || 0;
          return (
            <Card key={tipo.id} className="border-gray-200 rounded-xl hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 line-clamp-1" style={{ fontWeight: 600 }}>{tipo.descricao}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {/* Código como badge secundário — não é ID do instrumento, é da categoria */}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 border border-gray-200" style={{ fontFamily: 'monospace' }}>
                        {tipo.codigo}
                      </span>
                      {emUso > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200" style={{ fontWeight: 500 }}>
                          {emUso} em uso
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenEdit(tipo)}>
                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setDeleteId(tipo.id)}
                      disabled={emUso > 0}
                    >
                      <Trash2 className={`w-3.5 h-3.5 ${emUso > 0 ? 'text-gray-300' : 'text-red-500'}`} />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-gray-400 min-w-[64px]" style={{ fontWeight: 500 }}>CAPACIDADE</span>
                    <span className="text-xs text-gray-700">{tipo.capacidade || '—'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-gray-400 min-w-[64px]" style={{ fontWeight: 500 }}>TOLERÂNCIA</span>
                    <span className="text-xs text-emerald-700" style={{ fontWeight: 600 }}>{tipo.tolerancia}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-gray-400 min-w-[64px]" style={{ fontWeight: 500 }}>UNIDADE</span>
                    <span className="text-xs text-gray-700">{tipo.unidade || '—'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-gray-400 min-w-[64px]" style={{ fontWeight: 500 }}>LOCAL USO</span>
                    <span className="text-xs text-gray-500 italic">
                      {tipo.localUso?.trim() ? tipo.localUso : 'Uso geral'}
                    </span>
                  </div>
                  {tipo.observacoes && (
                    <div className="flex items-start gap-2 pt-1">
                      <span className="text-[10px] text-gray-400 min-w-[64px]" style={{ fontWeight: 500 }}>OBS</span>
                      <span className="text-xs text-gray-500 line-clamp-2">{tipo.observacoes}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Form Modal */}
      <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto p-0" aria-describedby="tipo-instrumento-form-description">
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg" style={{ fontWeight: 600 }}>
                {editingTipo ? 'Editar Tipo de Instrumento' : 'Novo Tipo de Instrumento'}
              </DialogTitle>
              <DialogDescription id="tipo-instrumento-form-description">
                Defina a categoria de instrumento com capacidade e tolerância padrão.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="px-6 py-5 space-y-5"
          >
            <Card className="border-gray-200 rounded-xl">
              <CardContent className="p-5 space-y-4">

                {/* Código + Descrição na mesma linha — código gerado e fixo, descrição é o campo principal */}
                <div className="flex gap-3 items-start">
                  <div className="w-28 flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-gray-600">Código</Label>
                    </div>
                    <Input
                      value={formData.codigo}
                      onChange={e => handleCodigoChange(e.target.value)}
                      className="text-sm"
                      style={{ fontFamily: 'monospace' }}
                      readOnly={!editingTipo}
                      aria-invalid={!!liveFormErrors.codigo}
                    />
                    <p className="text-[10px] text-blue-500 mt-1" style={{ fontWeight: 500 }}>automático · fixo</p>
                    {liveFormErrors.codigo && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {liveFormErrors.codigo}
                      </p>
                    )}
                  </div>

                  <div className="flex-1">
                    <Label className="text-xs text-gray-600">Descrição *</Label>
                    <Input
                      value={formData.descricao}
                      onChange={e => handleDescricaoChange(e.target.value)}
                      placeholder="Paquímetro Digital"
                      className="mt-1 text-sm"
                      autoFocus
                      aria-invalid={!!liveFormErrors.descricao}
                    />
                    {liveFormErrors.descricao && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {liveFormErrors.descricao}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Capacidade</Label>
                    <Input
                      value={formData.capacidade}
                      onChange={e => setFormData(p => ({ ...p, capacidade: e.target.value }))}
                      placeholder="0-150 mm"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Unidade</Label>
                    <Input
                      value={formData.unidade}
                      onChange={e => setFormData(p => ({ ...p, unidade: e.target.value }))}
                      placeholder="mm"
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-600">Tolerância Padrão *</Label>
                  <Input
                    value={formData.tolerancia}
                    onChange={e => {
                      const v = e.target.value;
                      setFormData(p => ({ ...p, tolerancia: v }));
                      if (liveFormErrors.tolerancia) setLiveFormErrors(prev => ({ ...prev, tolerancia: undefined }));
                    }}
                    placeholder="±0.05 mm"
                    className="mt-1 text-sm"
                    aria-invalid={!!liveFormErrors.tolerancia}
                  />
                  {liveFormErrors.tolerancia && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {liveFormErrors.tolerancia}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    Tolerância aceita para erros de calibração (ex: ±0.05, 0.1, ±1 mm)
                  </p>
                </div>

                {/* Local de Uso — campo aberto, opcional */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <Label className="text-xs text-gray-600">Local de Uso</Label>
                    <span className="text-[10px] text-gray-400">(opcional)</span>
                  </div>
                  <Input
                    value={formData.localUso}
                    onChange={e => setFormData(p => ({ ...p, localUso: e.target.value }))}
                    placeholder="Ex.: Produção — Linha A, Laboratório de Qualidade..."
                    className="mt-0 text-sm"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Deixe em branco se este tipo for de uso geral em toda a organização.
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-gray-600">Observações</Label>
                  <Textarea
                    value={formData.observacoes}
                    onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                    placeholder="Informações adicionais sobre este tipo..."
                    rows={3}
                    className="mt-1 text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pb-1">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="gap-2">
                <Save className="w-4 h-4" /> Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tipo de Instrumento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O tipo será removido da biblioteca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
