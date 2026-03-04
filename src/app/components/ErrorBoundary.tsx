import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary global para captura de erros não tratados.
 * Exibe uma tela amigável com opções de recuperação.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
          <div className="max-w-lg w-full text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h1
              className="text-gray-900 mb-2"
              style={{ fontSize: '1.5rem', fontWeight: 600 }}
            >
              Algo deu errado
            </h1>
            
            <p className="text-gray-500 mb-6" style={{ fontSize: '0.9375rem' }}>
              Ocorreu um erro inesperado. Tente recarregar a pagina ou voltar ao inicio.
            </p>

            {this.state.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                <p className="text-sm text-red-700" style={{ fontWeight: 500 }}>
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                style={{ fontWeight: 500 }}
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                style={{ fontWeight: 500 }}
              >
                <Home className="w-4 h-4" />
                Voltar ao Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
