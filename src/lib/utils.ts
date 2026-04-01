import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatClassName(name: string, section?: string | null): string {
  if (!section || section === '-') return name;
  return `${name} - ${section}`;
}
