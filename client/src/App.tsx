import { Route, Switch } from "wouter";
import { Toaster } from "@shared/components/ui/toaster";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from "@shared";
import { useTheme } from "@/hooks/useTheme";
import "./services/platform-detection-global";

const queryClient = new QueryClient();

function AppContent() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;