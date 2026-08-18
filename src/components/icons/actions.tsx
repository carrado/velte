import { createIcon } from "./base";

export const PlusIcon = createIcon("PlusIcon", {
  accent: (
    <path d="M10.8 3.5H13.2V10.8H20.5V13.2H13.2V20.5H10.8V13.2H3.5V10.8H10.8Z" />
  ),
});

export const PlusCircleIcon = createIcon("PlusCircleIcon", {
  base: <circle cx="12" cy="12" r="9" />,
  accent: <path d="M11 7.5H13V11H16.5V13H13V16.5H11V13H7.5V11H11Z" />,
});

export const CloseIcon = createIcon("CloseIcon", {
  accent: (
    <>
      <rect
        x="11"
        y="3"
        width="2"
        height="18"
        rx="1"
        transform="rotate(45 12 12)"
      />
      <rect
        x="11"
        y="3"
        width="2"
        height="18"
        rx="1"
        transform="rotate(-45 12 12)"
      />
    </>
  ),
});

export const CheckIcon = createIcon("CheckIcon", {
  accent: <path d="M9.8 16.2 4.9 11.3 3.5 12.7 9.8 19 20.5 8.3 19.1 6.9Z" />,
});

export const SearchIcon = createIcon("SearchIcon", {
  base: <circle cx="10.5" cy="10.5" r="7" />,
  accent: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        d="M10.5 3.8a6.7 6.7 0 1 0 0 13.4 6.7 6.7 0 0 0 0-13.4Z"
      />
      <rect
        x="14.6"
        y="18.5"
        width="4.6"
        height="3.2"
        rx="1.2"
        transform="rotate(-45 14.6 18.5)"
      />
    </>
  ),
});

export const SearchXIcon = createIcon("SearchXIcon", {
  base: <circle cx="10.5" cy="10.5" r="7" />,
  accent: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        d="M10.5 3.8a6.7 6.7 0 1 0 0 13.4 6.7 6.7 0 0 0 0-13.4Z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        d="M8 8l5 5M13 8l-5 5"
      />
      <rect
        x="14.6"
        y="18.5"
        width="4.6"
        height="3.2"
        rx="1.2"
        transform="rotate(-45 14.6 18.5)"
      />
    </>
  ),
});

export const FilterIcon = createIcon("FilterIcon", {
  accent: <path d="M4 5h16l-6 7.5V19l-4 2v-8.5z" />,
});

export const CopyIcon = createIcon("CopyIcon", {
  base: <rect x="5" y="5" width="11" height="11" rx="2" />,
  accent: <rect x="9" y="9" width="11" height="11" rx="2" />,
});

export const TrashIcon = createIcon("TrashIcon", {
  base: (
    <path d="M6 8.5 6.8 19.5A2 2 0 0 0 8.8 21.3h6.4A2 2 0 0 0 17.2 19.5L18 8.5Z" />
  ),
  accent: (
    <>
      <rect x="4" y="6" width="16" height="2.2" rx="1.1" />
      <rect x="9.5" y="3.3" width="5" height="2" rx="1" />
    </>
  ),
});

export const EditIcon = createIcon("EditIcon", {
  accent: <path d="M15.5 5.5 18.5 8.5 8.5 18.5H5.5v-3z" />,
});
export const PencilIcon = EditIcon;

export const SaveIcon = createIcon("SaveIcon", {
  base: (
    <path d="M5 4.5h11L19.5 9v10a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5Z" />
  ),
  accent: (
    <>
      <rect x="7.5" y="14.3" width="9" height="5.2" rx=".5" />
      <rect x="7.5" y="4.5" width="7" height="4" />
    </>
  ),
});

export const DownloadIcon = createIcon("DownloadIcon", {
  accent: (
    <>
      <path d="M12.9 4v9.3l3-3 1.4 1.4L12 17l-5.3-5.3 1.4-1.4 3 3V4Z" />
      <rect x="4.5" y="18.3" width="15" height="2.2" rx="1.1" />
    </>
  ),
});

export const UploadIcon = createIcon("UploadIcon", {
  accent: (
    <>
      <path d="M11.1 20v-9.3l-3 3-1.4-1.4L12 7l5.3 5.3-1.4 1.4-3-3V20Z" />
      <rect x="4.5" y="18.3" width="15" height="2.2" rx="1.1" />
    </>
  ),
});

export const ShareIcon = createIcon("ShareIcon", {
  base: <rect x="4.5" y="12.5" width="15" height="7.5" rx="2" />,
  accent: (
    <path d="M12.9 14V4.7l2.8 2.8 1.4-1.4L12 1 6.9 6.1l1.4 1.4 2.8-2.8V14Z" />
  ),
});

export const Share2Icon = createIcon("Share2Icon", {
  accent: (
    <>
      <circle cx="18" cy="5.5" r="2.4" />
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="18" cy="18.5" r="2.4" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        d="m8 10.8 8-4.4M8 13.2l8 4.4"
      />
    </>
  ),
});

export const SendIcon = createIcon("SendIcon", {
  accent: <path d="M20 4 4 10.6l6.3 2.4L13 20 20 4Z" />,
});

export const RefreshIcon = createIcon("RefreshIcon", {
  accent: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        d="M4.5 12a7.5 7.5 0 0 1 12.6-5.5L19.5 8.5"
      />
      <path d="M20.3 4.2 21 9.3 15.9 9Z" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        d="M19.5 12a7.5 7.5 0 0 1-12.6 5.5L4.5 15.5"
      />
      <path d="M3.7 19.8 3 14.7 8.1 15Z" />
    </>
  ),
});

export const LogOutIcon = createIcon("LogOutIcon", {
  base: <rect x="4" y="4" width="8" height="16" rx="1.5" />,
  accent: <path d="M13.5 17.3 19 12l-5.5-5.3-1.4 1.4 3 2.9H9v2h6.1l-3 2.9Z" />,
});
