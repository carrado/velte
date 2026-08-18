import { createIcon } from "./base";

export const LockIcon = createIcon("LockIcon", {
  base: <rect x="4.5" y="10.5" width="15" height="10" rx="2" />,
  accent: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        d="M7.5 10.5V7.5a4.5 4.5 0 0 1 9 0v3"
      />
      <circle cx="12" cy="15" r="1.6" />
    </>
  ),
});

export const KeyIcon = createIcon("KeyIcon", {
  base: <circle cx="7.5" cy="15" r="3.5" />,
  accent: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      d="M10.2 12.3 18 4.5M15.5 7l2 2M18 4.5l2 2-2.2 2.2"
    />
  ),
});
export const KeyRoundIcon = KeyIcon;

const eyeAlmond =
  "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z";

export const EyeIcon = createIcon("EyeIcon", {
  base: <path d={eyeAlmond} />,
  accent: <circle cx="12" cy="12" r="2.75" />,
});

export const EyeOffIcon = createIcon("EyeOffIcon", {
  base: <path d={eyeAlmond} />,
  accent: (
    <>
      <circle cx="12" cy="12" r="2.75" />
      <rect
        x="11"
        y="1"
        width="2"
        height="24"
        rx="1"
        transform="rotate(45 12 12)"
      />
    </>
  ),
});

export const SettingsIcon = createIcon("SettingsIcon", {
  base: <circle cx="12" cy="12" r="6.5" />,
  accent: (
    <>
      <circle cx="12" cy="12" r="2.6" />
      <rect x="11.1" y="1.8" width="1.8" height="3.4" rx=".7" />
      <rect x="11.1" y="18.8" width="1.8" height="3.4" rx=".7" />
      <rect x="1.8" y="11.1" width="3.4" height="1.8" rx=".7" />
      <rect x="18.8" y="11.1" width="3.4" height="1.8" rx=".7" />
    </>
  ),
});

export const Settings2Icon = createIcon("Settings2Icon", {
  base: (
    <>
      <rect x="4" y="5.6" width="16" height="1.8" rx=".9" />
      <rect x="4" y="11.1" width="16" height="1.8" rx=".9" />
      <rect x="4" y="16.6" width="16" height="1.8" rx=".9" />
    </>
  ),
  accent: (
    <>
      <circle cx="14.5" cy="6.5" r="2.3" />
      <circle cx="7.5" cy="12" r="2.3" />
      <circle cx="16.5" cy="17.5" r="2.3" />
    </>
  ),
});

export const ListIcon = createIcon("ListIcon", {
  base: (
    <>
      <rect x="8.5" y="5" width="12" height="2" rx="1" />
      <rect x="8.5" y="11" width="12" height="2" rx="1" />
      <rect x="8.5" y="17" width="12" height="2" rx="1" />
    </>
  ),
  accent: (
    <>
      <circle cx="4.5" cy="6" r="1.4" />
      <circle cx="4.5" cy="12" r="1.4" />
      <circle cx="4.5" cy="18" r="1.4" />
    </>
  ),
});

export const LayoutGridIcon = createIcon("LayoutGridIcon", {
  base: (
    <>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  accent: <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5" />,
});

export const CalendarIcon = createIcon("CalendarIcon", {
  base: <rect x="3.5" y="5" width="17" height="15.5" rx="2" />,
  accent: (
    <>
      <rect x="3.5" y="5" width="17" height="4.5" rx="2" />
      <rect x="7" y="2" width="2" height="5" rx="1" />
      <rect x="15" y="2" width="2" height="5" rx="1" />
      <circle cx="8" cy="13.5" r="1.1" />
      <circle cx="12" cy="13.5" r="1.1" />
      <circle cx="16" cy="13.5" r="1.1" />
      <circle cx="8" cy="17" r="1.1" />
      <circle cx="12" cy="17" r="1.1" />
    </>
  ),
});

export const ClockIcon = createIcon("ClockIcon", {
  base: <circle cx="12" cy="12" r="9" />,
  accent: (
    <>
      <rect x="11.2" y="6.5" width="1.6" height="6" rx=".8" />
      <rect
        x="12"
        y="11.5"
        width="4.3"
        height="1.6"
        rx=".8"
        transform="rotate(35 12 12.3)"
      />
      <circle cx="12" cy="12" r="1.3" />
    </>
  ),
});

export const DatabaseIcon = createIcon("DatabaseIcon", {
  base: <path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6Z" />,
  accent: (
    <>
      <ellipse cx="12" cy="6" rx="7.5" ry="3" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"
      />
    </>
  ),
});

export const PlugIcon = createIcon("PlugIcon", {
  base: <path d="M6.5 8.5h11v3a5.5 5.5 0 0 1-11 0Z" />,
  accent: (
    <>
      <rect x="8.2" y="2.3" width="1.8" height="6.2" rx=".9" />
      <rect x="14" y="2.3" width="1.8" height="6.2" rx=".9" />
      <rect x="11.1" y="16.5" width="1.8" height="5.5" rx=".9" />
    </>
  ),
});

export const BotIcon = createIcon("BotIcon", {
  base: <rect x="4.5" y="9" width="15" height="10" rx="3" />,
  accent: (
    <>
      <rect x="11.1" y="4.3" width="1.8" height="4.7" rx=".9" />
      <circle cx="12" cy="3.5" r="1.2" />
      <rect x="1.8" y="12.3" width="2" height="3.4" rx="1" />
      <rect x="20.2" y="12.3" width="2" height="3.4" rx="1" />
      <circle cx="9" cy="14" r="1.3" />
      <circle cx="15" cy="14" r="1.3" />
      <rect x="9" y="17" width="6" height="1.6" rx=".8" />
    </>
  ),
});

export const UtensilsIcon = createIcon("UtensilsIcon", {
  accent: (
    <>
      <path d="M6.3 3h1.4v6a1 1 0 0 0 2 0V3h1.4v6a2.4 2.4 0 0 1-1.7 2.3V21H7.9v-9.7A2.4 2.4 0 0 1 6.3 9Z" />
      <path d="M16 3c-1.5 0-2.5 2-2.5 5s.9 4.4 2.2 4.9V21h1.6v-8.1c1.3-.5 2.2-2 2.2-4.9 0-3-1-5-2.5-5-.3 0-.7 0-1 .1V3Z" />
    </>
  ),
});

export const ShirtIcon = createIcon("ShirtIcon", {
  accent: <path d="M8 3.5 12 5l4-1.5 4 3.5-3 3-1-1v9.5H8V9l-1 1-3-3Z" />,
});

export const CpuIcon = createIcon("CpuIcon", {
  base: <rect x="7" y="7" width="10" height="10" rx="1.5" />,
  accent: (
    <>
      <rect x="10" y="10" width="4" height="4" />
      <rect x="11" y="1.5" width="2" height="3.5" rx="1" />
      <rect x="11" y="19" width="2" height="3.5" rx="1" />
      <rect x="1.5" y="11" width="3.5" height="2" rx="1" />
      <rect x="19" y="11" width="3.5" height="2" rx="1" />
    </>
  ),
});

export const LeafIcon = createIcon("LeafIcon", {
  accent: <path d="M5.5 18.5C3 12 6 5.5 17.5 4.5c1 11.5-5.5 14.5-12 14Z" />,
});

export const FlameIcon = createIcon("FlameIcon", {
  base: (
    <path d="M12 3c1 3-3 4.5-3 8a3 3 0 0 0 6 0c1 .7 1.5 2 1.5 3.2a4.5 4.5 0 0 1-9 0C7.5 10.8 10 8.5 12 3Z" />
  ),
  accent: (
    <path d="M12.3 10.5c.4 1.3-1.2 2-1.2 3.4a1.4 1.4 0 0 0 2.8 0c.3.3.5.8.5 1.3a2 2 0 0 1-4 0c0-1.7 1.2-2.9 1.9-4.7Z" />
  ),
});

export const ChefHatIcon = createIcon("ChefHatIcon", {
  base: (
    <path d="M7 20.5V13.8a4.3 4.3 0 0 1-1.5-8c.4-2 2.2-3.3 4-3a3 3 0 0 1 5 0c1.8-.3 3.6 1 4 3a4.3 4.3 0 0 1-1.5 8v6.7Z" />
  ),
  accent: <rect x="7" y="16.5" width="10" height="2" rx="1" />,
});

export const WrenchIcon = createIcon("WrenchIcon", {
  accent: (
    <path d="M15.5 4.5a4.5 4.5 0 0 0-5.8 5.8L4 16v3.5h3.5l5.7-5.7a4.5 4.5 0 0 0 5.8-5.8L16 11l-3-3Z" />
  ),
});

export const BabyIcon = createIcon("BabyIcon", {
  base: <circle cx="12" cy="8" r="4.5" />,
  accent: (
    <>
      <circle cx="10" cy="7.7" r=".8" />
      <circle cx="14" cy="7.7" r=".8" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        d="M9.5 9.5c.6.6 1.4 1 2.5 1s1.9-.4 2.5-1"
      />
      <path d="M6 14c0-1 .8-1.8 1.8-1.8h8.4c1 0 1.8.8 1.8 1.8 0 3.3-3.6 6-8 6s-8-2.7-8-6Z" />
    </>
  ),
});
