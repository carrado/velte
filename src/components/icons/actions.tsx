"use client";

import {
  ArrowsClockwise,
  Check,
  Copy,
  DownloadSimple,
  Export,
  FloppyDisk,
  Funnel,
  MagnifyingGlass,
  MagnifyingGlassMinus,
  PencilSimple,
  Plus,
  PlusCircle,
  ShareNetwork,
  SignOut,
  PaperPlaneTilt,
  Square,
  Trash,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { wrapIcon } from "./base";

export const PlusIcon = wrapIcon(Plus, { displayName: "PlusIcon" });
export const PlusCircleIcon = wrapIcon(PlusCircle, {
  displayName: "PlusCircleIcon",
});
/** Regular weight — duotone X draws a soft filled plate behind the mark,
 *  which reads as an unwanted background on modal close buttons. */
export const CloseIcon = wrapIcon(X, {
  weight: "regular",
  displayName: "CloseIcon",
});
/** Heavier X for unlabeled close controls (credits modal, etc.). */
export const CloseBoldIcon = wrapIcon(X, {
  weight: "bold",
  displayName: "CloseBoldIcon",
});
export const CheckIcon = wrapIcon(Check, { displayName: "CheckIcon" });
export const SearchIcon = wrapIcon(MagnifyingGlass, {
  displayName: "SearchIcon",
});
export const SearchXIcon = wrapIcon(MagnifyingGlassMinus, {
  displayName: "SearchXIcon",
});
export const FilterIcon = wrapIcon(Funnel, { displayName: "FilterIcon" });
export const CopyIcon = wrapIcon(Copy, { displayName: "CopyIcon" });
export const TrashIcon = wrapIcon(Trash, { displayName: "TrashIcon" });
export const EditIcon = wrapIcon(PencilSimple, { displayName: "EditIcon" });
export const PencilIcon = EditIcon;
export const SaveIcon = wrapIcon(FloppyDisk, { displayName: "SaveIcon" });
export const DownloadIcon = wrapIcon(DownloadSimple, {
  displayName: "DownloadIcon",
});
export const UploadIcon = wrapIcon(UploadSimple, { displayName: "UploadIcon" });
export const ShareIcon = wrapIcon(Export, { displayName: "ShareIcon" });
export const Share2Icon = wrapIcon(ShareNetwork, { displayName: "Share2Icon" });
export const SendIcon = wrapIcon(PaperPlaneTilt, { displayName: "SendIcon" });
export const RefreshIcon = wrapIcon(ArrowsClockwise, {
  displayName: "RefreshIcon",
});
export const LogOutIcon = wrapIcon(SignOut, { displayName: "LogOutIcon" });
/** Filled square — composer "stop generation" control (was lucide Square). */
export const SquareIcon = wrapIcon(Square, {
  weight: "fill",
  displayName: "SquareIcon",
});
