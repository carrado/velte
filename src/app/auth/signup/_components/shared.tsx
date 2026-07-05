import type { FieldErrorProps } from "@/types/auth";

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return <p className="text-red-400 text-xs mt-1">{message}</p>;
}
