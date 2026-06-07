// Fängt Render-Fehler einer Seite ab, damit nicht die ganze App leer wird.

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="notice notice-error" style={{ marginTop: 24 }}>
          <strong>Etwas ist schiefgelaufen.</strong> Bitte laden Sie die Seite neu. Falls das Problem
          bestehen bleibt, wenden Sie sich an einen Administrator.
        </div>
      );
    }
    return this.props.children;
  }
}
