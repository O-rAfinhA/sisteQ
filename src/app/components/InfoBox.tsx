import { Info } from 'lucide-react';
import { ReactNode } from 'react';

interface InfoBoxProps {
  children: ReactNode;
}

export function InfoBox({ children }: InfoBoxProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          {children}
        </div>
      </div>
    </div>
  );
}
