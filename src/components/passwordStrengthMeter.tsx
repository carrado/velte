"use client";

import {
  passwordStrength,
  getPasswordStrengthColor,
  getPasswordStrengthText,
} from "@/lib/password-utils";

export function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = passwordStrength(password);
  const color = getPasswordStrengthColor(strength);
  const text = getPasswordStrengthText(strength);

  if (password.length === 0) return null;

  return (
    <div className="mt-1 space-y-1">
      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${(strength / 5) * 100}%` }}
        />
      </div>
      <p className={`text-xs ${color.replace("bg-", "text-")}`}>{text}</p>
    </div>
  );
}
