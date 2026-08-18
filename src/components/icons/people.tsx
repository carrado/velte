import { createIcon } from "./base";

export const UserIcon = createIcon("UserIcon", {
  base: <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5Z" />,
  accent: <circle cx="12" cy="8" r="3.5" />,
});

export const UserRoundIcon = createIcon("UserRoundIcon", {
  base: <circle cx="12" cy="12" r="9" />,
  accent: (
    <>
      <circle cx="12" cy="9.5" r="3" />
      <path d="M6.3 18.7C7.1 15.9 9.3 14.5 12 14.5s4.9 1.4 5.7 4.2A9 9 0 0 1 6.3 18.7Z" />
    </>
  ),
});

const userPlusShoulders = "M3.5 20c0-3.6 2.7-6.5 6-6.5s6 2.9 6 6.5Z";

export const UserPlusIcon = createIcon("UserPlusIcon", {
  base: <path d={userPlusShoulders} />,
  accent: (
    <>
      <circle cx="9.5" cy="8" r="3.5" />
      <path d="M17.2 6.3H18.8V9H21.5V10.6H18.8V13.3H17.2V10.6H14.5V9H17.2Z" />
    </>
  ),
});

export const UserCheckIcon = createIcon("UserCheckIcon", {
  base: <path d={userPlusShoulders} />,
  accent: (
    <>
      <circle cx="9.5" cy="8" r="3.5" />
      <path d="M15.9 12.1 17.5 13.7 20.6 10.1 21.7 11.1 17.6 15.9 14.8 13.1Z" />
    </>
  ),
});

export const UserCogIcon = createIcon("UserCogIcon", {
  base: <path d={userPlusShoulders} />,
  accent: (
    <>
      <circle cx="9.5" cy="8" r="3.5" />
      <circle cx="18" cy="15" r="2.3" />
      <rect x="17.3" y="10.7" width="1.4" height="2" rx=".5" />
      <rect x="17.3" y="17.3" width="1.4" height="2" rx=".5" />
      <rect x="20.3" y="14.3" width="2" height="1.4" rx=".5" />
      <rect x="13.7" y="14.3" width="2" height="1.4" rx=".5" />
    </>
  ),
});

export const UsersIcon = createIcon("UsersIcon", {
  base: (
    <>
      <circle cx="16.2" cy="8.3" r="2.8" />
      <path d="M13.8 20c.4-3 2.4-5.4 5-5.9 2.4.6 4.2 2.9 4.5 5.9Z" />
    </>
  ),
  accent: (
    <>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3 20c0-3.5 2.7-6.2 6-6.2s6 2.7 6 6.2a12 12 0 0 1-12 0Z" />
    </>
  ),
});

export const BuildingIcon = createIcon("BuildingIcon", {
  base: <rect x="5" y="3.5" width="10" height="17" rx="1" />,
  accent: (
    <>
      <rect x="15" y="9.5" width="4.5" height="11" rx="1" />
      <rect x="7.6" y="6.5" width="1.8" height="1.8" />
      <rect x="10.6" y="6.5" width="1.8" height="1.8" />
      <rect x="7.6" y="10" width="1.8" height="1.8" />
      <rect x="10.6" y="10" width="1.8" height="1.8" />
      <rect x="7.6" y="13.5" width="1.8" height="1.8" />
      <rect x="10.6" y="13.5" width="1.8" height="1.8" />
    </>
  ),
});

export const BriefcaseIcon = createIcon("BriefcaseIcon", {
  base: <rect x="3" y="7.5" width="18" height="11.5" rx="2" />,
  accent: (
    <>
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5h-1.6V6.2a.5.5 0 0 0-.5-.5h-2.8a.5.5 0 0 0-.5.5v1.3Z" />
      <rect x="3" y="12" width="18" height="1.6" />
    </>
  ),
});
