import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { clearAllFromIndexedDB } from "@/utils/indexedDB";

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Keep log for debugging; UI avoids blank screen.
    console.error("[ErrorBoundary] Uncaught error:", error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = async () => {
    try {
      await clearAllFromIndexedDB();
    } catch {
      // ignore
    }

    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }

    try {
      localStorage.clear();
    } catch {
      // ignore
    }

    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Algo deu errado</CardTitle>
            <CardDescription>
              Para evitar tela em branco, mostramos esta tela de recuperação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTitle>Erro inesperado</AlertTitle>
              <AlertDescription className="break-words">
                {import.meta.env.DEV
                  ? this.state.error?.message
                  : "Tente recarregar. Se continuar, limpe os dados locais."}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button variant="outline" onClick={this.handleReload}>
                Recarregar
              </Button>
              <Button variant="destructive" onClick={this.handleClearAndReload}>
                Limpar dados locais
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
