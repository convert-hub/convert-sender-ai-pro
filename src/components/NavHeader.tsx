import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, History, Grid3x3, Target, Upload, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { useBatches } from "@/hooks/useBatches";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Stepper } from "./Stepper";
import UserMenu from "./UserMenu";
import logo from "@/assets/logo.png";

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

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/import")}
          >
            <Upload className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Importar</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/campaigns")}
            className="relative"
          >
            <Target className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Campanhas</span>
            {activeCampaignsCount > 0 && (
              <Badge 
                variant="secondary" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {activeCampaignsCount}
              </Badge>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/batches")}
            className="relative"
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Blocos</span>
            {batches.filter(b => b.status === 'ready').length > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {batches.filter(b => b.status === 'ready').length}
              </Badge>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/history")}
            className="relative"
          >
            <History className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Histórico</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/settings")}
            className="relative"
          >
            <Settings className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Configurações</span>
            {isCustomWebhook && (
              <Badge 
                variant="secondary" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                !
              </Badge>
            )}
          </Button>

          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
            >
              <Shield className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          )}

          <UserMenu />
        </div>
      </div>
    </header>
  );
};
