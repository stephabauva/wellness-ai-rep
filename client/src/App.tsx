import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from "@/context/AppContext";
import "./services/platform-detection-global";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <Switch>
              <Route path="/" component={Home} />
              <Route component={NotFound} />
            </Switch>
            <Toaster />
          </div>
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;