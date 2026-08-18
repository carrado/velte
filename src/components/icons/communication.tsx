import { createIcon } from "./base";

const messageSquareShape = "M4 5.5h16v11H9l-5 4V16.5Z";

export const MessageCircleIcon = createIcon("MessageCircleIcon", {
  base: (
    <>
      <circle cx="12" cy="11" r="8.5" />
      <path d="M8.5 18.3 5.3 21.3v-4.4Z" />
    </>
  ),
  accent: (
    <>
      <circle cx="8.7" cy="11" r="1.2" />
      <circle cx="12" cy="11" r="1.2" />
      <circle cx="15.3" cy="11" r="1.2" />
    </>
  ),
});

export const MessageSquareIcon = createIcon("MessageSquareIcon", {
  base: <path d={messageSquareShape} />,
  accent: (
    <>
      <circle cx="9" cy="11" r="1.1" />
      <circle cx="12" cy="11" r="1.1" />
      <circle cx="15" cy="11" r="1.1" />
    </>
  ),
});

export const MessageSquarePlusIcon = createIcon("MessageSquarePlusIcon", {
  base: <path d={messageSquareShape} />,
  accent: (
    <path d="M11.2 7.5H12.8V10.2H15.5V11.8H12.8V14.5H11.2V11.8H8.5V10.2H11.2Z" />
  ),
});

export const PhoneIcon = createIcon("PhoneIcon", {
  accent: (
    <path d="M5.3 4h3l1.4 4.5-2.2 1.8a13 13 0 0 0 6.2 6.2l1.8-2.2 4.5 1.4v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.8 5.6 1.5 1.5 0 0 1 5.3 4Z" />
  ),
});

export const MailIcon = createIcon("MailIcon", {
  base: <rect x="3" y="5.5" width="18" height="13" rx="2" />,
  accent: <path d="M3.5 6.5 12 13l8.5-6.5.9 1.6L12 15.3 2.6 8.1Z" />,
});

export const MailCheckIcon = createIcon("MailCheckIcon", {
  base: <rect x="3" y="5.5" width="18" height="13" rx="2" />,
  accent: (
    <>
      <path d="M3.5 6.5 12 13l8.5-6.5.9 1.6L12 15.3 2.6 8.1Z" />
      <path d="M15.8 15.8 17.3 17.3 20.8 13.8 21.9 14.9 17.3 19.5 14.7 16.9Z" />
    </>
  ),
});

const bellShape =
  "M6 10.5a6 6 0 0 1 12 0c0 4 1.2 5.3 1.5 5.8a.6.6 0 0 1-.5.9H5a.6.6 0 0 1-.5-.9C4.8 15.8 6 14.5 6 10.5Z";

export const BellIcon = createIcon("BellIcon", {
  base: <path d={bellShape} />,
  accent: <ellipse cx="12" cy="19.6" rx="2.1" ry="1.3" />,
});

export const BellOffIcon = createIcon("BellOffIcon", {
  base: <path d={bellShape} />,
  accent: (
    <>
      <ellipse cx="12" cy="19.6" rx="2.1" ry="1.3" />
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

export const AtSignIcon = createIcon("AtSignIcon", {
  accent: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        d="M15.75 12v1.5a2.25 2.25 0 0 0 4.5 0V12a8.25 8.25 0 1 1-3.5 6.75"
      />
      <circle
        cx="12"
        cy="12"
        r="3.75"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      />
    </>
  ),
});

export const ClipboardListIcon = createIcon("ClipboardListIcon", {
  base: <rect x="5" y="5" width="14" height="15.5" rx="2" />,
  accent: (
    <>
      <path d="M9 4.5h6a.5.5 0 0 1 .5.5v1.5h-7V5a.5.5 0 0 1 .5-.5Z" />
      <rect x="8.5" y="10.2" width="7" height="1.6" rx=".8" />
      <rect x="8.5" y="13.7" width="7" height="1.6" rx=".8" />
      <rect x="8.5" y="17.2" width="4.5" height="1.6" rx=".8" />
    </>
  ),
});

const filePageShape =
  "M6.5 3.5h8l5 5v11.5a.5.5 0 0 1-.5.5h-12a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z";

export const FileTextIcon = createIcon("FileTextIcon", {
  base: <path d={filePageShape} />,
  accent: (
    <>
      <path d="M14.5 3.5V9h5Z" />
      <rect x="8.5" y="12.2" width="7" height="1.5" rx=".75" />
      <rect x="8.5" y="15.7" width="7" height="1.5" rx=".75" />
    </>
  ),
});

export const FileCheckIcon = createIcon("FileCheckIcon", {
  base: <path d={filePageShape} />,
  accent: (
    <>
      <path d="M14.5 3.5V9h5Z" />
      <path d="M9.9 15.1 8.2 13.4l1.2-1.2 1.5 1.5 3.5-3.5 1.2 1.2Z" />
    </>
  ),
});

export const ScrollTextIcon = createIcon("ScrollTextIcon", {
  base: <rect x="6" y="3.5" width="12" height="17" rx="2" />,
  accent: (
    <>
      <rect x="9" y="8" width="5" height="1.4" rx=".7" />
      <rect x="9" y="11" width="5" height="1.4" rx=".7" />
      <circle cx="7.5" cy="18" r="1.6" />
    </>
  ),
});

export const CopyrightIcon = createIcon("CopyrightIcon", {
  base: <circle cx="12" cy="12" r="9" />,
  accent: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      d="M14.3 9.8a2.9 2.9 0 1 0 0 4.4"
    />
  ),
});
