import { cn } from "@/lib/utils";

export function LogoLoader({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="35" stroke="#142C5B" strokeWidth="14" strokeDasharray="55 165" strokeLinecap="round" />
      <circle cx="50" cy="50" r="35" stroke="#2E90FA" strokeWidth="14" strokeDasharray="55 165" strokeLinecap="round" transform="rotate(120 50 50)" />
      <circle cx="50" cy="50" r="35" stroke="#3facff" strokeWidth="14" strokeDasharray="55 165" strokeLinecap="round" transform="rotate(240 50 50)" />
    </svg>
  );
}
