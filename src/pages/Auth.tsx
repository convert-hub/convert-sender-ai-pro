import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import logo from "@/assets/logo.png";
const loginSchema = z.object({
  email: z.string().trim().email({
    message: 'Email inválido'
  }),
  password: z.string().min(6, {
    message: 'Senha deve ter no mínimo 6 caracteres'
  })
});
const signupSchema = z.object({
  email: z.string().trim().email({
    message: 'Email inválido'
  }),
  password: z.string().min(6, {
    message: 'Senha deve ter no mínimo 6 caracteres'
  }),
  fullName: z.string().trim().min(2, {
    message: 'Nome deve ter no mínimo 2 caracteres'
  }).max(100, {
    message: 'Nome muito longo'
  })
});
const Auth = () => {
  const navigate = useNavigate();
  const {
    user,
    signIn,
    signUp,
    loading
  } = useAuth();
  const {
    toast
  } = useToast();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = loginSchema.parse({
        email: loginEmail,
        password: loginPassword
      });
      setIsLoading(true);
      const {
        error
      } = await signIn(validated.email, validated.password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Erro ao fazer login',
            description: 'Email ou senha incorretos',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Erro ao fazer login',
            description: error.message,
            variant: 'destructive'
          });
        }
      } else {
        toast({
          title: 'Login realizado!',
          description: 'Bem-vindo de volta'
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: err.errors[0].message,
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = signupSchema.parse({
        email: signupEmail,
        password: signupPassword,
        fullName: signupFullName
      });
      setIsLoading(true);
      const {
        error
      } = await signUp(validated.email, validated.password, validated.fullName);
      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: 'Erro ao criar conta',
            description: 'Este email já está cadastrado',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Erro ao criar conta',
            description: error.message,
            variant: 'destructive'
          });
        }
      } else {
        toast({
          title: 'Conta criada com sucesso!',
          description: 'Verifique seu email para confirmar o cadastro'
        });
        // Clear form
        setSignupEmail('');
        setSignupPassword('');
        setSignupFullName('');
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: err.errors[0].message,
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={logo} alt="Convert Sender" className="h-12" />
          </div>
          
          <p className="text-muted-foreground mt-2">Seus disparos feitos
de forma inteligente </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Criar Conta</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Entrar</CardTitle>
                <CardDescription>Entre com suas credenciais</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="seu@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </> : 'Entrar'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Criar Conta</CardTitle>
                <CardDescription>Cadastre-se para começar a usar</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input id="signup-name" type="text" placeholder="Seu nome" value={signupFullName} onChange={e => setSignupFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="seu@email.com" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input id="signup-password" type="password" placeholder="••••••••" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </> : 'Criar Conta'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>;
};
export default Auth;