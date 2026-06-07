// @ts-nocheck
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";

export function AuthNavbar() {
  const [location] = useLocation();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(255, 255, 255, 0.72)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
      }}
    >
      <div className="max-w-[1024px] mx-auto flex items-center justify-between h-[72px] px-5">
        {/* Logo */}
        <Link href="/login" className="flex items-center gap-2.5 no-underline">
          <img
            src="/teamflow-logo.png"
            alt="TeamFlow"
            className="h-12 w-auto object-contain drop-shadow-sm"
          />
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-0">
          {[
            { label: "Funciones", href: "#" },
            { label: "Soluciones", href: "#" },
            { label: "Recursos", href: "#" },
            { label: "Precios", href: "#" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="no-underline px-4 py-1.5 text-xs transition-colors duration-200"
              style={{
                color: "#424245",
                fontWeight: 400,
                letterSpacing: "0.01em",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#1d1d1f")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#424245")}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="no-underline text-xs transition-colors duration-200"
            style={{
              color: location === "/login" ? "#0071e3" : "#424245",
              fontWeight: location === "/login" ? 500 : 400,
            }}
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="no-underline text-xs px-4 py-1.5 rounded-full transition-all duration-200"
            style={{
              background: location === "/register" ? "#0071e3" : "#1d1d1f",
              color: "#ffffff",
              fontWeight: 400,
            }}
            onMouseEnter={(e) => {
              if (location !== "/register") e.currentTarget.style.background = "#333336";
            }}
            onMouseLeave={(e) => {
              if (location !== "/register") e.currentTarget.style.background = "#1d1d1f";
            }}
          >
            Registrarse
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
