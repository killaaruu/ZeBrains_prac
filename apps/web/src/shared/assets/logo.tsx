import type { SVGProps } from "react";
import { cn } from "@/shared/lib/utils";

/** Generic placeholder logo — replace with your product's mark. */
export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-6 w-auto", className)}
      {...props}
    >
      <title>Logo</title>
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path
        d="M7 16V8l5 5 5-5v8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
