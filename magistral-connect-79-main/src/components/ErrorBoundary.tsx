import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh', 
          padding: '20px',
          backgroundColor: '#f9fafb',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ 
            maxWidth: '600px', 
            width: '100%',
            textAlign: 'center',
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h1 style={{ 
              color: '#ef4444', 
              marginBottom: '16px',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              Erro na Aplicação
            </h1>
            <p style={{ 
              color: '#6b7280', 
              marginBottom: '24px' 
            }}>
              Ocorreu um erro ao carregar a aplicação. Verifique o console para mais detalhes.
            </p>
            {this.state.error && (
              <details style={{ 
                marginBottom: '24px',
                textAlign: 'left',
                backgroundColor: '#f3f4f6',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  Detalhes do erro
                </summary>
                <pre style={{ 
                  marginTop: '8px',
                  overflow: 'auto',
                  fontSize: '12px',
                  color: '#374151',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error.toString()}
                  {this.state.error.stack && `\n\nStack:\n${this.state.error.stack}`}
                </pre>
              </details>
            )}
            <button
              onClick={() => {
                window.location.reload();
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
