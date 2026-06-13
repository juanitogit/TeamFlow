import { motion } from "framer-motion";

interface LogoLoaderProps {
  text?: string;
}

export function LogoLoader({ text = "Cargando..." }: LogoLoaderProps) {
  return (
    <div className="min-h-[50vh] w-full flex flex-col items-center justify-center space-y-6 py-12">
      <div className="relative">
        {/* Glow effect behind the logo */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
        />
        
        {/* Spinning / Pulsing Logo */}
        <motion.img
          src="/logo.png"
          alt="Loading..."
          className="h-16 w-16 object-contain relative z-10 drop-shadow-md"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
      
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="text-primary font-medium tracking-wide text-sm"
      >
        {text}
      </motion.p>
    </div>
  );
}
