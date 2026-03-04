import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { FileDown, Sparkles, File } from 'lucide-react';
import { useStrategic } from '../context/StrategicContext';
import { generateStrategicPlanPDF as generatePremiumPDF } from '../utils/pdfGeneratorPremium';
import { generateStrategicPlanPDF as generateSimplePDF } from '../utils/pdfGenerator';
import { toast } from 'sonner';

interface PDFExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PDFExportDialog({ open, onOpenChange }: PDFExportDialogProps) {
  const { dados, anoAtual } = useStrategic();

  const handleExportPremium = () => {
    try {
      generatePremiumPDF(dados, anoAtual, {});
      toast.success('PDF Premium gerado com sucesso! 🎉');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao gerar PDF Premium:', error);
      toast.error('Erro ao gerar PDF Premium. Tente novamente.');
    }
  };

  const handleExportSimple = () => {
    try {
      generateSimplePDF(dados, anoAtual, {});
      toast.success('PDF gerado com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileDown className="w-6 h-6 text-blue-600" />
            Exportar Planejamento Estratégico
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 mt-6">
          {/* PDF Premium */}
          <div className="relative border-2 border-purple-300 rounded-lg p-8 hover:shadow-xl transition-all bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col items-center justify-center min-h-[180px]">
            <div className="absolute -top-3 -right-3">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                PREMIUM
              </div>
            </div>
            
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-xl text-gray-900 mb-6" style={{ fontWeight: 700 }}>PDF Premium</h3>

            <Button
              onClick={handleExportPremium}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white gap-2"
              size="lg"
            >
              <Sparkles className="w-5 h-5" />
              Gerar PDF Premium
            </Button>
          </div>

          {/* PDF Simples */}
          <div className="border-2 border-gray-300 rounded-lg p-8 hover:shadow-lg transition-all bg-white flex flex-col items-center justify-center min-h-[180px]">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <File className="w-8 h-8 text-gray-600" />
            </div>
            
            <h3 className="text-xl text-gray-900 mb-6" style={{ fontWeight: 700 }}>PDF Simples</h3>

            <Button
              onClick={handleExportSimple}
              variant="outline"
              className="w-full gap-2 border-gray-400 hover:bg-gray-50"
              size="lg"
            >
              <File className="w-5 h-5" />
              Gerar PDF Simples
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}