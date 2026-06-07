import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { AuthNavbar } from "@/components/auth-navbar";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export function Login() {
  const [_, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const login = useLogin();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");

    if (token) {
      setToken(token);
      window.history.replaceState({}, "", "/login");
      setLocation("/");
      return;
    }

    if (error === "github_denied") {
      toast({ variant: "destructive", title: "GitHub login cancelled" });
    } else if (error === "github_failed") {
      toast({ variant: "destructive", title: "GitHub login failed", description: "Please try again or use email." });
    } else if (error === "no_github_email") {
      toast({ variant: "destructive", title: "No email found", description: "Your GitHub account has no public email. Use email login instead." });
    }
  }, []);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    login.mutate(
      { data },
      {
        onSuccess: (res) => {
          setToken(res.token);
          setLocation("/");
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Login failed",
            description: "Please check your credentials and try again.",
          });
        },
      }
    );
  };

  const handleGitHubLogin = () => {
    window.location.href = "/api/auth/github";
  };

  return (
    <>
      <AuthNavbar />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen flex items-center justify-center bg-cloud p-4 pt-20"
      >
      <Card className="w-full max-w-md card-monday">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-light tracking-tight text-ink">Welcome back</CardTitle>
          <CardDescription className="text-slate">
            Sign in to your TeamFlow account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full btn-pill flex items-center gap-3 border-2 hover:border-primary/30 hover:bg-primary/5 transition-all"
            onClick={handleGitHubLogin}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            Iniciar sesión con GitHub
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-mist" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-slate">o con email</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full btn-pill bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={login.isPending}
              >
                {login.isPending ? "Iniciando sesión..." : "Iniciar sesión"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-slate">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Regístrate
            </Link>
          </div>
        </CardFooter>
      </Card>
      </motion.div>
    </>
  );
}
