import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import OrderDetails from "@/pages/order-details";
import Expenses from "@/pages/expenses";
import Users from "@/pages/users";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-primary rounded-lg mb-4 mx-auto"></div>
          <div className="h-4 bg-muted rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/orders" component={Orders} />
          <Route path="/orders/:id" component={OrderDetails} />
          <Route path="/expenses" component={Expenses} />
          <Route path="/users" component={Users} />
          <Route path="/analytics" component={() => <div className="p-6">Analytics coming soon...</div>} />
          <Route path="/integrations" component={() => <div className="p-6">Integrations coming soon...</div>} />
          <Route path="/settings" component={() => <div className="p-6">Settings coming soon...</div>} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
