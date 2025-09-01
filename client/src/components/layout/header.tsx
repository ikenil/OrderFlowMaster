import { Button } from "@/components/ui/button";
import { FolderSync, Bell } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async () => {
      // FolderSync from all platforms
      const platforms = ['amazon', 'flipkart', 'meesho'];
      const syncPromises = platforms.map(platform =>
        apiRequest('POST', `/api/sync/${platform}`)
      );
      await Promise.all(syncPromises);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Orders synced successfully from all platforms",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to sync orders. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-sync-orders"
          >
            <FolderSync className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'FolderSync Orders'}
          </Button>
          <div className="relative">
            <button className="p-2 text-muted-foreground hover:text-foreground relative" data-testid="button-notifications">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
