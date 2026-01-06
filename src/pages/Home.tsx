import { Layout } from "@/components/Layout";
import { HomeWhatsAppStatus } from "@/components/HomeWhatsAppStatus";
import { QuickActions } from "@/components/QuickActions";
import { QuickStats } from "@/components/QuickStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDispatch } from "@/contexts/DispatchContext";
import { useBatches } from "@/hooks/useBatches";
import { useNavigate } from "react-router-dom";
import { Grid3x3, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const Home = () => {
  const { reset } = useDispatch();
  const { batches } = useBatches();
  const navigate = useNavigate();

  const readyBatches = batches.filter(b => b.status === 'ready');
  const totalContacts = readyBatches.reduce((sum, b) => sum + b.contacts.length, 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* WhatsApp Connection Status - Priority */}
        <HomeWhatsAppStatus />

        {/* Quick Stats */}
        <QuickStats />

        {/* Quick Actions */}
        <QuickActions />

        {/* Pending Batches Card */}
        {readyBatches.length > 0 && (
          <Card className="border-primary/50 bg-primary/5 animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Grid3x3 className="h-5 w-5" />
                Blocos Prontos para Envio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Você tem {readyBatches.length} blocos prontos
                  </span>
                  <Badge variant="secondary">
                    {totalContacts} contatos
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => navigate('/batches')} 
                    className="flex-1"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Ir para Blocos
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (confirm('Tem certeza que deseja descartar todos os blocos?')) {
                        reset();
                        toast({ title: 'Blocos descartados' });
                      }
                    }}
                  >
                    Descartar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Home;