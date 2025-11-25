import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, History, Grid3x3, Target, Upload, Shield, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { useBatches } from "@/hooks/useBatches";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Stepper } from "./Stepper";
import UserMenu from "./UserMenu";
import logo from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const NavHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { batches } = useBatches();
  const { campaigns } = useCampaigns();
  const { settings } = useUserSettings();

  const isCustomWebhook = settings?.webhook_url !== "https://n8n.converthub.com.br/webhook/disparos-precatorizei";
  const activeCampaignsCount = campaigns.filter(c => c.status === 'active').length;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate("/")}
        >
          <img src={logo} alt="Convert Sender A.I." className="h-10" />
        </div>

        {/* Stepper */}
        <div className="hidden md:flex flex-1 justify-center px-8">
          <Stepper currentPath={location.pathname} />
        </div>

        {/* Actions - Menu Colapsável */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Menu className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Menu</span>
                {/* Badge de notificações combinadas */}
                {(activeCampaignsCount > 0 || batches.filter(b => b.status === 'ready').length > 0 || isCustomWebhook) && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    !
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background">
              <DropdownMenuItem onClick={() => navigate("/import")}>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => navigate("/campaigns")} className="relative">
                <Target className="h-4 w-4 mr-2" />
                Campanhas
                {activeCampaignsCount > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {activeCampaignsCount}
                  </Badge>
                )}
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => navigate("/batches")} className="relative">
                <Grid3x3 className="h-4 w-4 mr-2" />
                Blocos
                {batches.filter(b => b.status === 'ready').length > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {batches.filter(b => b.status === 'ready').length}
                  </Badge>
                )}
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => navigate("/history")}>
                <History className="h-4 w-4 mr-2" />
                Histórico
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => navigate("/settings")} className="relative">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
                {isCustomWebhook && (
                  <Badge variant="secondary" className="ml-auto">!</Badge>
                )}
              </DropdownMenuItem>
              
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="h-4 w-4 mr-2" />
                    Admin
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <UserMenu />
        </div>
      </div>
    </header>
  );
};
