"use client";

import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  ArrowsDownUp,
  ArrowUp,
  ArrowUpRight,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  Compass,
  Crosshair,
  Globe,
  Link as LinkGlyph,
  List,
  MapPin,
  DotsThree,
  DotsThreeVertical,
} from "@phosphor-icons/react";
import { wrapIcon } from "./base";

export const ArrowLeftIcon = wrapIcon(ArrowLeft, {
  displayName: "ArrowLeftIcon",
});
export const ArrowRightIcon = wrapIcon(ArrowRight, {
  displayName: "ArrowRightIcon",
});
export const ArrowUpIcon = wrapIcon(ArrowUp, { displayName: "ArrowUpIcon" });
export const ArrowUpRightIcon = wrapIcon(ArrowUpRight, {
  displayName: "ArrowUpRightIcon",
});
export const ArrowDownLeftIcon = wrapIcon(ArrowDownLeft, {
  displayName: "ArrowDownLeftIcon",
});
export const ArrowUpDownIcon = wrapIcon(ArrowsDownUp, {
  displayName: "ArrowUpDownIcon",
});
export const ChevronLeftIcon = wrapIcon(CaretLeft, {
  displayName: "ChevronLeftIcon",
});
export const ChevronRightIcon = wrapIcon(CaretRight, {
  displayName: "ChevronRightIcon",
});
export const ChevronUpIcon = wrapIcon(CaretUp, {
  displayName: "ChevronUpIcon",
});
export const ChevronDownIcon = wrapIcon(CaretDown, {
  displayName: "ChevronDownIcon",
});

// Ergonomic aliases matching Lucide naming convention
export const ChevronRight = ChevronRightIcon;
export const ChevronLeft = ChevronLeftIcon;
export const ChevronUp = ChevronUpIcon;
export const ChevronDown = ChevronDownIcon;
export const ExternalLinkIcon = wrapIcon(ArrowSquareOut, {
  displayName: "ExternalLinkIcon",
});
export const CompassIcon = wrapIcon(Compass, { displayName: "CompassIcon" });
export const LocateFixedIcon = wrapIcon(Crosshair, {
  displayName: "LocateFixedIcon",
});
export const MapPinIcon = wrapIcon(MapPin, { displayName: "MapPinIcon" });
export const LinkIcon = wrapIcon(LinkGlyph, { displayName: "LinkIcon" });
export const GlobeIcon = wrapIcon(Globe, { displayName: "GlobeIcon" });
export const MenuIcon = wrapIcon(List, { displayName: "MenuIcon" });
export const MoreHorizontalIcon = wrapIcon(DotsThree, {
  displayName: "MoreHorizontalIcon",
});
export const MoreVerticalIcon = wrapIcon(DotsThreeVertical, {
  displayName: "MoreVerticalIcon",
});
