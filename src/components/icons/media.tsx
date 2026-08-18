import { createIcon } from "./base";

export const CameraIcon = createIcon("CameraIcon", {
  base: (
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.2-2h5.6l1.2 2h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" />
  ),
  accent: (
    <>
      <circle
        cx="12"
        cy="13"
        r="3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      />
      <circle cx="13.3" cy="11.7" r=".9" />
    </>
  ),
});

export const ImageIcon = createIcon("ImageIcon", {
  base: <rect x="3.5" y="4.5" width="17" height="15" rx="2" />,
  accent: (
    <>
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m4 17.5 5-5 3.5 3.5 3-3 4.5 4.5Z" />
    </>
  ),
});

export const ImagePlusIcon = createIcon("ImagePlusIcon", {
  base: <rect x="3.5" y="4.5" width="13" height="15" rx="2" />,
  accent: (
    <>
      <circle cx="8" cy="9.5" r="1.5" />
      <path d="m4 17.5 4.5-4.5 3 3 2.5-2.5 3 3Z" />
      <path d="M18.2 4.5H19.8V7.2H22.5V8.8H19.8V11.5H18.2V8.8H15.5V7.2H18.2Z" />
    </>
  ),
});

export const ImagesIcon = createIcon("ImagesIcon", {
  base: <rect x="3.5" y="4" width="14" height="12" rx="1.5" />,
  accent: <rect x="6.5" y="7" width="14" height="12" rx="1.5" />,
});

export const VideoIcon = createIcon("VideoIcon", {
  base: <rect x="3" y="6.5" width="13" height="11" rx="2" />,
  accent: (
    <>
      <path d="m16 10.5 5-2.7v8.4l-5-2.7Z" />
      <path d="M7.5 9.5 11.5 12l-4 2.5Z" />
    </>
  ),
});

export const SparkleIcon = createIcon("SparkleIcon", {
  accent: (
    <path d="M12 3c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6Z" />
  ),
});

export const SparklesIcon = createIcon("SparklesIcon", {
  base: (
    <path d="M18.5 14c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5Z" />
  ),
  accent: (
    <path d="M11 3c.5 3 2 4.5 5 5-3 .5-4.5 2-5 5-.5-3-2-4.5-5-5 3-.5 4.5-2 5-5Z" />
  ),
});

export const PartyPopperIcon = createIcon("PartyPopperIcon", {
  base: <path d="M4 20 14.5 9.5c1.5-1.5 1.5-3.5 0-4.5-1-1-3-1-4.5.5L5 10.5Z" />,
  accent: (
    <>
      <circle cx="19.5" cy="4.5" r="1.2" />
      <rect
        x="8.6"
        y="3.6"
        width="1.6"
        height="2.6"
        rx=".8"
        transform="rotate(20 9.4 4.9)"
      />
      <rect
        x="3.6"
        y="8.6"
        width="2.6"
        height="1.6"
        rx=".8"
        transform="rotate(20 4.9 9.4)"
      />
      <rect
        x="16.6"
        y="6.6"
        width="1.6"
        height="2.6"
        rx=".8"
        transform="rotate(-20 17.4 7.9)"
      />
      <rect
        x="18"
        y="10.6"
        width="1.6"
        height="2.6"
        rx=".8"
        transform="rotate(20 18.8 11.9)"
      />
    </>
  ),
});

export const HeartIcon = createIcon("HeartIcon", {
  accent: (
    <path d="M12 20s-7.5-4.6-9.7-9.3C1 7.7 2.6 4.5 6 4c2.3-.3 4.3.9 6 3 1.7-2.1 3.7-3.3 6-3 3.4.5 5 3.7 3.7 6.7C19.5 15.4 12 20 12 20Z" />
  ),
});
