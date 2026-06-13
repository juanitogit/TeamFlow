import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, TrendingUp, Users, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

export function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading || isAuthenticated) {
    return null;
  }
  return (
    <div className="min-h-screen bg-cloud font-sans overflow-x-hidden text-ink">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full bg-snow/80 backdrop-blur-md border-b border-mist">
        <div className="container max-w-[1200px] mx-auto flex h-20 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="TeamFlow Logo" className="h-10 w-auto" />
            <span className="font-bold text-2xl text-primary tracking-tight">TeamFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-slate font-medium hidden sm:flex hover:bg-slate-100">
                Contactar Ventas
              </Button>
            </Link>
            <Link href="/login">
              <Button className="btn-pill bg-primary hover:bg-primary/90 text-white px-6 py-5 shadow-sm">
                Ingresar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-24 pb-32 px-4 text-center max-w-[1000px] mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-light tracking-[-0.04em] leading-[1.1] mb-8"
          >
            Optimiza tu flujo de trabajo con{" "}
            <span className="font-semibold bg-gradient-to-r from-[#fe81e4] to-[#fda900] text-transparent bg-clip-text">
              inteligencia
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-slate max-w-2xl mx-auto mb-12"
          >
            TeamFlow centraliza las tareas de tu equipo, rastrea commits de GitHub y asigna puntos de rendimiento en un dashboard hermoso y profesional.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <Link href="/login">
              <Button className="btn-pill bg-primary hover:bg-primary/90 text-white text-lg px-8 py-6 shadow-xl-2">
                Empezar gratis
              </Button>
            </Link>
          </motion.div>

          {/* Product Mockup Image */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-20 rounded-[24px] overflow-hidden border border-mist shadow-xl relative"
          >
            <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070" 
              alt="Dashboard de Rendimiento" 
              className="w-full object-cover"
            />
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-snow px-4">
          <div className="container max-w-[1200px] mx-auto">
            <h2 className="text-3xl md:text-4xl font-light text-center mb-16 tracking-tight">
              Todo lo que tu equipo necesita en un solo lugar
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-sky/20 rounded-[24px] p-8 transition-transform hover:-translate-y-1">
                <div className="h-12 w-12 bg-snow rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-3">Métricas Reales</h3>
                <p className="text-slate leading-relaxed">
                  Conectado directamente a tus repositorios de GitHub. Mide los commits, validaciones y actividad real de los desarrolladores.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-mint/20 rounded-[24px] p-8 transition-transform hover:-translate-y-1">
                <div className="h-12 w-12 bg-snow rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-3">Gestión de Equipos</h3>
                <p className="text-slate leading-relaxed">
                  Asigna roles de Líder, Co-líder o Miembro. Crea workspaces infinitos para organizar diferentes áreas de tu empresa.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-lavender/40 rounded-[24px] p-8 transition-transform hover:-translate-y-1">
                <div className="h-12 w-12 bg-snow rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-3">Aportes Seguros</h3>
                <p className="text-slate leading-relaxed">
                  Cada aporte es validado por los líderes antes de sumar puntos al perfil, asegurando calidad en las entregas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Brand Banner */}
        <section className="py-32 bg-primary px-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "conic-gradient(from 270deg, #8181ff 15%, #33dbdb 40%, #33d58e 55%, #ffd633 65%, #fc527d 85%, #8181ff 100%)" }}></div>
          <div className="container max-w-[800px] mx-auto text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-light text-white mb-8 tracking-tight">
              ¿Listo para potenciar a tu equipo?
            </h2>
            <Link href="/login">
              <Button className="btn-pill bg-snow text-primary hover:bg-slate-100 text-lg px-8 py-6 shadow-xl-2">
                Crear tu Workspace
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-snow border-t border-mist py-12 px-4">
        <div className="container max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center text-slate">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <img src="/logo.png" alt="Logo" className="h-6 w-auto grayscale opacity-70" />
            <span className="font-semibold text-sm">TeamFlow</span>
          </div>
          <p className="text-sm">© 2026 TeamFlow Inc. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
