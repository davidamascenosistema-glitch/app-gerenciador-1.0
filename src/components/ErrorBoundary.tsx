import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-zinc-50 flex flex-col items-center justify-center p-6 text-zinc-800">
          <div className="max-w-md w-full bg-white rounded-3xl border border-zinc-200/90 p-6 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
              Algo não saiu como esperado
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Ocorreu uma falha temporária ao carregar esta seção. Você pode tentar recarregar para continuar de onde parou.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-700/20 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Recarregar aplicativo</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
