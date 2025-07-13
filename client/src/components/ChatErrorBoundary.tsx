import React from 'react';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ChatErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ChatErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

export class ChatErrorBoundary extends React.Component<ChatErrorBoundaryProps, ChatErrorBoundaryState> {
  constructor(props: ChatErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ChatErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ChatErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const isHooksError = this.state.error?.message?.includes('hooks') || 
                          this.state.error?.message?.includes('Rendered fewer hooks');

      return (
        <Card className="w-full max-w-2xl mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              {isHooksError ? 'Chat Component Error' : 'Something went wrong'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isHooksError ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  A React hooks error occurred while switching conversations. This is usually temporary.
                </p>
                <p className="text-sm font-mono bg-muted p-2 rounded">
                  {this.state.error?.message}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  An unexpected error occurred in the chat interface.
                </p>
                {this.state.error && (
                  <p className="text-sm font-mono bg-muted p-2 rounded">
                    {this.state.error.message}
                  </p>
                )}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button onClick={this.handleReset} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}