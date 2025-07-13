import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names using clsx and tailwind-merge
 * @used-by shared/ui-components, file-manager, unknown/needs-classification
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}