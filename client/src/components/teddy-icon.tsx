import { cn } from "@/lib/utils";

interface TeddyIconProps {
  className?: string;
  size?: number;
}

export function TeddyIcon({ className, size = 24 }: TeddyIconProps) {
  // If className is provided, let CSS handle sizing (like Lucide icons)
  // Otherwise, use the size prop as explicit dimensions
  return (
    <svg
      {...(className ? {} : { width: size, height: size })}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Head */}
      <ellipse cx="50" cy="35" rx="22" ry="25" fill="currentColor" />
      
      {/* Body */}
      <ellipse cx="50" cy="68" rx="20" ry="18" fill="currentColor" />
      
      {/* Eyes */}
      <circle cx="42" cy="32" r="4" fill="white" />
      <circle cx="58" cy="32" r="4" fill="white" />
      
      {/* Eye pupils */}
      <circle cx="42" cy="32" r="2" fill="currentColor" />
      <circle cx="58" cy="32" r="2" fill="currentColor" />
      
      {/* Nose */}
      <ellipse cx="50" cy="38" rx="1.5" ry="2" fill="currentColor" />
      
      {/* Mouth */}
      <path
        d="M 45 43 Q 50 46 55 43"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Antenna */}
      <circle cx="50" cy="12" r="3" fill="currentColor" />
      <line x1="50" y1="15" x2="50" y2="10" stroke="currentColor" strokeWidth="2.5" />
      
      {/* Arms */}
      <ellipse cx="28" cy="65" rx="6" ry="14" fill="currentColor" />
      <ellipse cx="72" cy="65" rx="6" ry="14" fill="currentColor" />
      
      {/* Chest panel/details */}
      <rect x="42" y="60" width="16" height="12" rx="2" fill="rgba(255,255,255,0.2)" />
      <line x1="47" y1="63" x2="47" y2="71" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <line x1="53" y1="63" x2="53" y2="71" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
    </svg>
  );
}

