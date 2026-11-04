import {
  ChatCircle,
  ChatTeardropText,
  NotePencil,
  Phone,
  Envelope,
  EnvelopeSimple,
  Bell,
  BellSlash,
  At,
  ClipboardText,
  FileText,
  ListChecks,
  Scroll,
  Copyright,
} from "@phosphor-icons/react";
import { wrapIcon } from "./base";

export const MessageCircleIcon = wrapIcon(ChatCircle, {
  displayName: "MessageCircleIcon",
});
export const MessageSquareIcon = wrapIcon(ChatTeardropText, {
  displayName: "MessageSquareIcon",
});
export const MessageSquarePlusIcon = wrapIcon(NotePencil, {
  displayName: "MessageSquarePlusIcon",
});
export const PhoneIcon = wrapIcon(Phone, { displayName: "PhoneIcon" });
export const MailIcon = wrapIcon(Envelope, { displayName: "MailIcon" });
export const MailCheckIcon = wrapIcon(EnvelopeSimple, {
  displayName: "MailCheckIcon",
});
export const BellIcon = wrapIcon(Bell, { displayName: "BellIcon" });
export const BellOffIcon = wrapIcon(BellSlash, { displayName: "BellOffIcon" });
export const AtSignIcon = wrapIcon(At, { displayName: "AtSignIcon" });
export const ClipboardListIcon = wrapIcon(ClipboardText, {
  displayName: "ClipboardListIcon",
});
export const FileTextIcon = wrapIcon(FileText, { displayName: "FileTextIcon" });
export const FileCheckIcon = wrapIcon(ListChecks, {
  displayName: "FileCheckIcon",
});
export const ScrollTextIcon = wrapIcon(Scroll, {
  displayName: "ScrollTextIcon",
});
export const CopyrightIcon = wrapIcon(Copyright, {
  displayName: "CopyrightIcon",
});
