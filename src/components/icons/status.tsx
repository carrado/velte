"use client";

import {
  WarningCircle,
  Warning,
  CheckCircle,
  XCircle,
  Info,
  Question,
  Shield,
  ShieldCheck,
  ShieldWarning,
  SealCheck,
  Prohibit,
  PlayCircle,
  WifiSlash,
  HardDrives,
  BatteryWarning,
  CircleNotch,
} from "@phosphor-icons/react";
import { wrapIcon } from "./base";

export const AlertCircleIcon = wrapIcon(WarningCircle, {
  displayName: "AlertCircleIcon",
});
export const AlertTriangleIcon = wrapIcon(Warning, {
  displayName: "AlertTriangleIcon",
});
export const CheckCircleIcon = wrapIcon(CheckCircle, {
  displayName: "CheckCircleIcon",
});
export const XCircleIcon = wrapIcon(XCircle, { displayName: "XCircleIcon" });
export const InfoIcon = wrapIcon(Info, { displayName: "InfoIcon" });
export const HelpCircleIcon = wrapIcon(Question, {
  displayName: "HelpCircleIcon",
});
export const ShieldIcon = wrapIcon(Shield, { displayName: "ShieldIcon" });
export const ShieldCheckIcon = wrapIcon(ShieldCheck, {
  displayName: "ShieldCheckIcon",
});
export const ShieldAlertIcon = wrapIcon(ShieldWarning, {
  displayName: "ShieldAlertIcon",
});
export const BadgeCheckIcon = wrapIcon(SealCheck, {
  displayName: "BadgeCheckIcon",
});
export const BanIcon = wrapIcon(Prohibit, { displayName: "BanIcon" });
export const PlayCircleIcon = wrapIcon(PlayCircle, {
  displayName: "PlayCircleIcon",
});
export const WifiOffIcon = wrapIcon(WifiSlash, { displayName: "WifiOffIcon" });
export const ServerCrashIcon = wrapIcon(HardDrives, {
  displayName: "ServerCrashIcon",
});
export const BatteryWarningIcon = wrapIcon(BatteryWarning, {
  displayName: "BatteryWarningIcon",
});
export const LoaderIcon = wrapIcon(CircleNotch, { displayName: "LoaderIcon" });
