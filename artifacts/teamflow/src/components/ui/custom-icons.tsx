import React from "react";

const sharedGradient = (
  <defs>
    <linearGradient id="brand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#0ea5e9" />
      <stop offset="100%" stopColor="#2563eb" />
    </linearGradient>
    <linearGradient id="brand-gradient-light" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#38bdf8" />
      <stop offset="100%" stopColor="#818cf8" />
    </linearGradient>
  </defs>
);

export const IconDashboard = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {sharedGradient}
    <rect x="3" y="3" width="7" height="7" rx="2" stroke="url(#brand-gradient)" strokeWidth="2" strokeLinejoin="round" />
    <rect x="14" y="3" width="7" height="7" rx="2" stroke="url(#brand-gradient-light)" strokeWidth="2" strokeLinejoin="round" />
    <rect x="14" y="14" width="7" height="7" rx="2" stroke="url(#brand-gradient)" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="6.5" cy="17.5" r="3.5" stroke="url(#brand-gradient)" strokeWidth="2" />
  </svg>
);

export const IconTasks = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {sharedGradient}
    <circle cx="5" cy="6" r="2" stroke="url(#brand-gradient)" strokeWidth="2" />
    <circle cx="5" cy="18" r="2" stroke="url(#brand-gradient)" strokeWidth="2" />
    <path d="M11 6H20" stroke="url(#brand-gradient-light)" strokeWidth="2" strokeLinecap="round" />
    <path d="M11 18H16" stroke="url(#brand-gradient)" strokeWidth="2" strokeLinecap="round" />
    <path d="M5 10V14" stroke="url(#brand-gradient)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconTeam = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {sharedGradient}
    <circle cx="12" cy="7" r="4" stroke="url(#brand-gradient)" strokeWidth="2" />
    <path d="M4 21C4 16.5817 7.58172 13 12 13C16.4183 13 20 16.5817 20 21" stroke="url(#brand-gradient-light)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="19" cy="8" r="3" stroke="url(#brand-gradient-light)" strokeWidth="2" opacity="0.5" />
    <circle cx="5" cy="8" r="3" stroke="url(#brand-gradient-light)" strokeWidth="2" opacity="0.5" />
  </svg>
);

export const IconSprints = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {sharedGradient}
    <circle cx="12" cy="12" r="9" stroke="url(#brand-gradient)" strokeWidth="2" strokeDasharray="4 4" />
    <circle cx="12" cy="12" r="5" stroke="url(#brand-gradient-light)" strokeWidth="2" />
    <path d="M12 7V12L15 15" stroke="url(#brand-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconMeetings = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {sharedGradient}
    <rect x="3" y="4" width="18" height="16" rx="3" stroke="url(#brand-gradient)" strokeWidth="2" />
    <path d="M8 2V6" stroke="url(#brand-gradient-light)" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 2V6" stroke="url(#brand-gradient-light)" strokeWidth="2" strokeLinecap="round" />
    <path d="M3 10H21" stroke="url(#brand-gradient)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="15" r="2" fill="url(#brand-gradient-light)" />
  </svg>
);

export const IconSwap = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {sharedGradient}
    <path d="M8 7L4 11L8 15" stroke="url(#brand-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 11H14" stroke="url(#brand-gradient)" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 17L20 13L16 9" stroke="url(#brand-gradient-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 13H10" stroke="url(#brand-gradient-light)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconLogout = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {sharedGradient}
    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="url(#brand-gradient)" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 17L21 12L16 7" stroke="url(#brand-gradient-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12H9" stroke="url(#brand-gradient-light)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
