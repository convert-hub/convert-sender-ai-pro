import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, User, Lock, Info } from 'lucide-react';

const roleDescriptions = [
  {
    role: 'admin',
    name: 'Administrador',
    description: 'Acesso total ao sistema com privilégios administrativos',
    icon: Shield,
    permissions: [
      'Gerenciar usuários e suas permissões',
      'Visualizar todas as campanhas do sistema',
      'Acessar painel administrativo completo',
      'Ver estatísticas agregadas do sistema',
      'Promover ou remover outros administradores',
    ],
    color: 'bg-primary',
  },
  {
    role: 'user',
    name: 'Usuário',
    description: 'Acesso padrão ao sistema com funcionalidades completas',
    icon: User,
    permissions: [
      'Criar e gerenciar suas próprias campanhas',
      'Importar e processar dados via planilhas',
      'Criar, agendar e enviar batches de contatos',
      'Visualizar histórico de seus disparos',
      'Configurar webhook personalizado',
      'Gerenciar templates de campanha personalizados',
    ],
    color: 'bg-secondary',
  },
];

const RolesManagement = () => {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Sistema de Permissões:</strong> O Convert Sender utiliza um sistema de roles
          baseado em Supabase com Row-Level Security (RLS) para garantir isolamento total de dados
          entre usuários e controle granular de acessos.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {roleDescriptions.map((roleInfo) => {
          const Icon = roleInfo.icon;
          return (
            <Card key={roleInfo.role}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${roleInfo.color}`}>
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle>{roleInfo.name}</CardTitle>
                    <CardDescription>{roleInfo.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Permissões:
                  </h4>
                  <ul className="space-y-2">
                    {roleInfo.permissions.map((permission, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Badge variant="outline" className="mt-0.5 shrink-0">
                          ✓
                        </Badge>
                        <span className="text-muted-foreground">{permission}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Segurança e RLS Policies</CardTitle>
          <CardDescription>
            Como o sistema garante isolamento e segurança dos dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Row-Level Security (RLS)</h4>
            <p className="text-sm text-muted-foreground">
              Todas as tabelas principais (campaigns, batches, dispatch_history, user_settings)
              possuem políticas RLS que garantem que cada usuário só acessa seus próprios dados.
              As verificações são feitas automaticamente no nível do banco de dados.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Funções de Segurança</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • <code className="text-xs bg-muted px-1 py-0.5 rounded">has_role(user_id, role)</code>
                : Verifica se usuário possui determinada role
              </li>
              <li>
                • <code className="text-xs bg-muted px-1 py-0.5 rounded">get_user_roles(user_id)</code>
                : Retorna todas as roles de um usuário
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Validação Multi-Camada</h4>
            <p className="text-sm text-muted-foreground">
              O sistema valida permissões em três níveis: Frontend (AuthContext + AdminRoute),
              API (Supabase Client) e Database (RLS Policies), garantindo segurança mesmo que
              uma camada seja comprometida.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RolesManagement;
