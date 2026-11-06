"use client";

import {
  User,
  UserCircle,
  UserPlus,
  UserCheck,
  UserGear,
  Users,
  Buildings,
  Briefcase,
} from "@phosphor-icons/react";
import { wrapIcon } from "./base";

export const UserIcon = wrapIcon(User, { displayName: "UserIcon" });
export const UserRoundIcon = wrapIcon(UserCircle, {
  displayName: "UserRoundIcon",
});
export const UserPlusIcon = wrapIcon(UserPlus, { displayName: "UserPlusIcon" });
export const UserCheckIcon = wrapIcon(UserCheck, {
  displayName: "UserCheckIcon",
});
export const UserCogIcon = wrapIcon(UserGear, { displayName: "UserCogIcon" });
export const UsersIcon = wrapIcon(Users, { displayName: "UsersIcon" });
export const BuildingIcon = wrapIcon(Buildings, {
  displayName: "BuildingIcon",
});
export const BriefcaseIcon = wrapIcon(Briefcase, {
  displayName: "BriefcaseIcon",
});
