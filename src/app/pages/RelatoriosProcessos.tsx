import { Construction } from 'lucide-react';

export default function RelatoriosProcessos() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <div>
        <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>Relatórios de Processos</h1>
        <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Análises e relatórios consolidados dos processos
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 border-dashed p-12">
        <div className="text-center">
          <Construction className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-gray-900 mb-2" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            Em Desenvolvimento
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Os Relatórios de Processos estarão disponíveis em breve. Esta funcionalidade 
            permitirá gerar análises e relatórios consolidados sobre os processos da empresa.
          </p>
        </div>
      </div>
    </div>
  );
}