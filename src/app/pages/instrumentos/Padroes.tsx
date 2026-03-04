/**
 * Biblioteca de Padrões
 * Cadastro, certificados e controle de validade
 */
import React, { useState, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import { toast } from 'sonner';
import {
  AlertCircle, BookOpen, Plus, Eye, Edit2, Trash2, Search, Upload, Download, X, Save,
} from 'lucide-react';
import { formatarData, dataHojeISO } from '../../utils/formatters';
import { generateId } from '../../utils/helpers';
import {
  useInstrumentos,
  calcularStatusPadrao,
  STATUS_CONFIG,
  type PadraoReferencia,
} from '../../hooks/useInstrumentos';

export function InstrumentosPadroes() {
  const { padroes, setPadroes, instrumentos } = useInstrumentos();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPadrao, setEditingPadrao] = useState<PadraoReferencia | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ data: string; nome: string } | null>(null);
  const [liveFormErrors, setLiveFormErrors] = useState<{
    codigo?: string;
    descricao?: string;
    numCertificado?: string;
    validade?: string;
    certificado?: string;
  }>({});

  const [formData, setFormData] = useState({
    codigo: '', descricao: '', numCertificado: '', validade: '',
    certificadoBase64: '', certificadoNome: '',
  });

  function resetForm() {
    setFormData({ codigo: '', descricao: '', numCertificado: '', validade: '', certificadoBase64: '', certificadoNome: '' });
  }

  const filtrados = useMemo(() => {
    return padroes.filter(p => {
      const status = calcularStatusPadrao(p);
      const matchBusca = !busca || p.codigo.toLowerCase().includes(busca.toLowerCase()) || p.descricao.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === 'todos' || status === filtroStatus;
      return matchBusca && matchStatus;
    }).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [padroes, busca, filtroStatus]);

  function handleOpenNew() { setEditingPadrao(null); resetForm(); setLiveFormErrors({}); setIsFormOpen(true); }

  function handleOpenEdit(p: PadraoReferencia) {
    setEditingPadrao(p);
    setLiveFormErrors({});
    setFormData({
      codigo: p.codigo, descricao: p.descricao, numCertificado: p.numCertificado,
      validade: p.validade,
      certificadoBase64: p.certificadoBase64 || '', certificadoNome: p.certificadoNome || '',
    });
    setIsFormOpen(true);
  }

  function handleSave() {
    try {
      const errors: {
        codigo?: string;
        descricao?: string;
        numCertificado?: string;
        validade?: string;
        certificado?: string;
      } = {};

      if (!formData.codigo.trim()) errors.codigo = 'Informe o código do padrão.';
      if (!formData.descricao.trim()) errors.descricao = 'Informe a descrição.';
      if (!formData.numCertificado.trim()) errors.numCertificado = 'Informe o nº do certificado.';
      if (!formData.validade) errors.validade = 'Informe a validade.';

      const codigoNormalizado = formData.codigo.trim();
      const duplicado = padroes.find(p => p.codigo.toLowerCase() === codigoNormalizado.toLowerCase() && p.id !== editingPadrao?.id);
      if (codigoNormalizado && duplicado) errors.codigo = 'Já existe um padrão com este código.';

      if (formData.certificadoNome && !formData.certificadoBase64) errors.certificado = 'Certificado inválido. Reenvie o arquivo.';

      if (Object.keys(errors).length > 0) {
        setLiveFormErrors(errors);
        toast.error('Revise os campos obrigatórios.');
        return;
      }

      const agora = dataHojeISO();
      if (editingPadrao) {
        setPadroes(prev => prev.map(p => p.id === editingPadrao.id ? {
          ...p, codigo: formData.codigo.trim(), descricao: formData.descricao.trim(),
          numCertificado: formData.numCertificado.trim(),
          validade: formData.validade, certificadoBase64: formData.certificadoBase64 || undefined,
          certificadoNome: formData.certificadoNome || undefined, dataAtualizacao: agora,
        } : p));
        toast.success('Padrão atualizado.');
      } else {
        const novo: PadraoReferencia = {
          id: generateId('pad-'), codigo: formData.codigo.trim(), descricao: formData.descricao.trim(),
          numCertificado: formData.numCertificado.trim(),
          validade: formData.validade, certificadoBase64: formData.certificadoBase64 || undefined,
          certificadoNome: formData.certificadoNome || undefined, dataCriacao: agora, dataAtualizacao: agora,
        };
        setPadroes(prev => [...prev, novo]);
        toast.success('Padrão cadastrado.');
      }
      setIsFormOpen(false);
    } catch {
      toast.error('Não foi possível salvar o padrão. Tente novamente.');
    }
  }

  function handleDelete() {
    if (!deleteId) return;
    const emUso = instrumentos.some(i => i.padraoUtilizadoId === deleteId);
    if (emUso) { toast.error('Este padrão está vinculado a um ou mais instrumentos e não pode ser excluído.'); setDeleteId(null); return; }
    setPadroes(prev => prev.filter(p => p.id !== deleteId));
    setDeleteId(null);
    toast.success('Padrão excluído.');
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) { toast.error('Envie um arquivo PDF.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Arquivo deve ter no máximo 5 MB.'); return; }
    try {
      const reader = new FileReader();
      reader.onerror = () => {
        toast.error('Falha ao ler o arquivo. Tente novamente.');
      };
      reader.onload = () => {
        setFormData(p => ({ ...p, certificadoBase64: reader.result as string, certificadoNome: file.name }));
        if (liveFormErrors.certificado) setLiveFormErrors(prev => ({ ...prev, certificado: undefined }));
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Falha ao processar o arquivo. Tente novamente.');
    }
  }

  function handleFormOpenChange(open: boolean) {
    setIsFormOpen(open);
    if (!open) setLiveFormErrors({});
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Lista de Padrões
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Padrões de referência para verificações internas. Certificados em local único.
          </p>
        </div>
      </div>

      {/* Barra de ações */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar padrão..." className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-2">
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-9 text-xs w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="valido">Válido</SelectItem>
              <SelectItem value="atencao">Vence em 30d</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleOpenNew} className="gap-2 h-9"><Plus className="w-4 h-4" /> Novo Padrão</Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 600 }}>Código</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 600 }}>Descrição</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 600 }}>Nº Certificado</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 600 }}>Validade</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 600 }}>Status</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 600 }}>Vinculados</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 600 }}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center">
                  <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Nenhum padrão cadastrado.</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={handleOpenNew}><Plus className="w-4 h-4" /> Cadastrar Padrão</Button>
                </td></tr>
              )}
              {filtrados.map(padrao => {
                const status = calcularStatusPadrao(padrao);
                const stCfg = STATUS_CONFIG[status];
                const vinculados = instrumentos.filter(i => i.padraoUtilizadoId === padrao.id).length;
                return (
                  <tr key={padrao.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3"><span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{padrao.codigo}</span></td>
                    <td className="px-4 py-3"><span className="text-sm text-gray-700">{padrao.descricao}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-gray-600">{padrao.numCertificado}</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-xs text-gray-600">{formatarData(padrao.validade)}</span></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${stCfg.bg} ${stCfg.text} ${stCfg.border}`} style={{ fontWeight: 500 }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dotColor}`} />{stCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs ${vinculados > 0 ? 'text-gray-700' : 'text-gray-400'}`} style={{ fontWeight: vinculados > 0 ? 500 : 400 }}>{vinculados}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {padrao.certificadoBase64 && <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPdfPreview({ data: padrao.certificadoBase64!, nome: padrao.certificadoNome || 'certificado.pdf' })}><Eye className="w-3.5 h-3.5 text-blue-500" /></Button>}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenEdit(padrao)}><Edit2 className="w-3.5 h-3.5 text-gray-500" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteId(padrao.id)}><Trash2 className="w-3.5 h-3.5 text-gray-500" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto p-0" aria-describedby="padrao-form-description">
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg" style={{ fontWeight: 600 }}>
                {editingPadrao ? 'Editar Padrão' : 'Novo Padrão de Referência'}
              </DialogTitle>
              <DialogDescription id="padrao-form-description">
                Cadastro do padrão de referência para verificações internas.
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
                <div>
                  <Label className="text-xs text-gray-600">Código *</Label>
                  <Input
                    value={formData.codigo}
                    onChange={e => {
                      const v = e.target.value;
                      setFormData(p => ({ ...p, codigo: v }));
                      if (liveFormErrors.codigo) setLiveFormErrors(prev => ({ ...prev, codigo: undefined }));
                    }}
                    placeholder="PAD-001"
                    className="mt-1 text-sm"
                    aria-invalid={!!liveFormErrors.codigo}
                    autoFocus
                  />
                  {liveFormErrors.codigo && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {liveFormErrors.codigo}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Descrição *</Label>
                  <Input
                    value={formData.descricao}
                    onChange={e => {
                      const v = e.target.value;
                      setFormData(p => ({ ...p, descricao: v }));
                      if (liveFormErrors.descricao) setLiveFormErrors(prev => ({ ...prev, descricao: undefined }));
                    }}
                    placeholder="Bloco padrão 50mm"
                    className="mt-1 text-sm"
                    aria-invalid={!!liveFormErrors.descricao}
                  />
                  {liveFormErrors.descricao && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {liveFormErrors.descricao}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Nº do Certificado *</Label>
                  <Input
                    value={formData.numCertificado}
                    onChange={e => {
                      const v = e.target.value;
                      setFormData(p => ({ ...p, numCertificado: v }));
                      if (liveFormErrors.numCertificado) setLiveFormErrors(prev => ({ ...prev, numCertificado: undefined }));
                    }}
                    placeholder="Nº do certificado"
                    className="mt-1 text-sm"
                    aria-invalid={!!liveFormErrors.numCertificado}
                  />
                  {liveFormErrors.numCertificado && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {liveFormErrors.numCertificado}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Validade *</Label>
                  <Input
                    type="date"
                    value={formData.validade}
                    onChange={e => {
                      const v = e.target.value;
                      setFormData(p => ({ ...p, validade: v }));
                      if (liveFormErrors.validade) setLiveFormErrors(prev => ({ ...prev, validade: undefined }));
                    }}
                    className="mt-1 text-sm"
                    aria-invalid={!!liveFormErrors.validade}
                  />
                  {liveFormErrors.validade && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {liveFormErrors.validade}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Certificado (PDF)</Label>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <label className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 text-xs text-gray-600 transition-colors">
                      <Upload className="w-3.5 h-3.5" />{formData.certificadoNome || 'Selecionar arquivo PDF'}
                      <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                    </label>
                    {formData.certificadoNome && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setFormData(p => ({ ...p, certificadoBase64: '', certificadoNome: '' }));
                            if (liveFormErrors.certificado) setLiveFormErrors(prev => ({ ...prev, certificado: undefined }));
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 p-0 text-blue-600 text-xs gap-1"
                          onClick={() => setPdfPreview({ data: formData.certificadoBase64, nome: formData.certificadoNome })}
                          disabled={!formData.certificadoBase64}
                        >
                          <Eye className="w-3 h-3" /> Preview
                        </Button>
                      </>
                    )}
                  </div>
                  {liveFormErrors.certificado && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {liveFormErrors.certificado}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <DialogFooter className="pb-1">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="gap-2"><Save className="w-4 h-4" /> Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Padrão</AlertDialogTitle><AlertDialogDescription>Padrões vinculados a instrumentos não podem ser excluídos.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Preview */}
      <Dialog open={!!pdfPreview} onOpenChange={() => setPdfPreview(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{pdfPreview?.nome}</span>
              {pdfPreview?.data && <a href={pdfPreview.data} download={pdfPreview.nome} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"><Download className="w-4 h-4" /> Download</a>}
            </DialogTitle>
            <DialogDescription>Visualização do certificado em PDF.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">{pdfPreview?.data && <iframe src={pdfPreview.data} className="w-full h-full rounded-lg border" title="Preview do certificado" />}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
