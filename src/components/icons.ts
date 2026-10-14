"use client";

import { createElement, type ComponentType } from "react";
import { Icon as IconifyIcon, type IconProps as IconifyProps } from "@iconify/react";
import streamlineIcons from "@/lib/streamline-color-icons.json";

type ColorIconProps = Omit<IconifyProps, "icon"> & {
  size?: number | string;
};

export type Icon = ComponentType<ColorIconProps>;

const icons = streamlineIcons as Record<string, { body: string; width: number; height: number }>;

function coloredIcon(name: string, label: string): Icon {
  const icon = icons[name];
  if (!icon) throw new Error(`Missing Streamline Color icon: ${name}`);

  const Component = (props: ColorIconProps) => {
    const { size, width, height, ...rest } = props;
    return createElement(IconifyIcon, {
      ...rest,
      icon,
      width: width ?? size ?? "1em",
      height: height ?? size ?? "1em",
    });
  };
  Component.displayName = label;
  return Component;
}

export const ArrowDown = coloredIcon("arrow-down-2", "ArrowDown");
export const ArrowLeft = coloredIcon("arrow-round-left", "ArrowLeft");
export const ArrowRight = coloredIcon("arrow-round-right", "ArrowRight");
export const RefreshCw = coloredIcon("arrow-reload-horizontal-1", "RefreshCw");
export const RotateCcw = coloredIcon("arrow-reload-horizontal-2", "RotateCcw");
export const Minimize = coloredIcon("minimize-window-2", "Minimize");
export const Maximize = coloredIcon("expand-window-2", "Maximize");
export const Building2 = coloredIcon("office-building-1", "Building2");
export const Calendar = coloredIcon("blank-calendar", "Calendar");
export const CalendarDays = coloredIcon("calendar-add", "CalendarDays");
export const ChevronDown = coloredIcon("arrow-down-2", "ChevronDown");
export const ChevronsLeft = coloredIcon("move-left", "ChevronsLeft");
export const ChevronsRight = coloredIcon("move-right", "ChevronsRight");
export const ChevronLeft = coloredIcon("arrow-round-left", "ChevronLeft");
export const ChevronRight = coloredIcon("arrow-round-right", "ChevronRight");
export const ChevronUp = coloredIcon("arrow-up-1", "ChevronUp");
export const MessageCircle = coloredIcon("chat-bubble-oval", "MessageCircle");
export const MessageSquare = coloredIcon("chat-bubble-square-question", "MessageSquare");
export const Check = coloredIcon("check", "Check");
export const CheckCircle2 = coloredIcon("check-square", "CheckCircle2");
export const Clock = coloredIcon("circle-clock", "Clock");
export const Copy = coloredIcon("copy-paste", "Copy");
export const CreditCard = coloredIcon("credit-card-1", "CreditCard");
export const Mail = coloredIcon("mail-send-envelope", "Mail");
export const Eye = coloredIcon("eye-optic", "Eye");
export const EyeOff = coloredIcon("invisible-1", "EyeOff");
export const FilePlus2 = coloredIcon("file-add-alternate", "FilePlus2");
export const LuFilePlus2 = coloredIcon("file-add-alternate", "LuFilePlus2");
export const FileText = coloredIcon("new-file", "FileText");
export const Save = coloredIcon("floppy-disk", "Save");
export const Filter = coloredIcon("filter-2", "Filter");
export const Hash = coloredIcon("sign-hashtag", "Hash");
export const ImagePlus = coloredIcon("edit-image-photo", "ImagePlus");
export const Zap = coloredIcon("flash-1", "Zap");
export const List = coloredIcon("bullet-list", "List");
export const Menu = coloredIcon("app-store", "Menu");
export const Lock = coloredIcon("padlock-square-1", "Lock");
export const Search = coloredIcon("search-visual", "Search");
export const Map = coloredIcon("map-fold", "Map");
export const MapPin = coloredIcon("location-pin-3", "MapPin");
export const Minus = coloredIcon("pathfinder-minus-front-1", "Minus");
export const Moon = coloredIcon("waning-cresent-moon", "Moon");
export const Package = coloredIcon("shipping-box-1", "Package");
export const PackageCheck = coloredIcon("shipment-check", "PackageCheck");
export const PackageSearch = coloredIcon("search-dollar", "PackageSearch");
export const Palette = coloredIcon("color-palette", "Palette");
export const LuSend = coloredIcon("mail-send-email-message", "LuSend");
export const Edit = coloredIcon("pencil", "Edit");
export const Pencil = coloredIcon("pencil", "Pencil");
export const Phone = coloredIcon("phone", "Phone");
export const PhoneCall = coloredIcon("phone-ringing-1", "PhoneCall");
export const Plus = coloredIcon("add-1", "Plus");
export const Printer = coloredIcon("printer", "Printer");
export const Receipt = coloredIcon("receipt", "Receipt");
export const LuReceiptText = coloredIcon("receipt", "LuReceiptText");
export const LogOut = coloredIcon("logout-1", "LogOut");
export const LuLayoutDashboard = coloredIcon("dashboard-3", "LuLayoutDashboard");
export const Shield = coloredIcon("shield-1", "Shield");
export const ShieldCheck = coloredIcon("shield-check", "ShieldCheck");
export const Loader2 = coloredIcon("signal-loading", "Loader2");
export const Boxes = coloredIcon("archive-box", "Boxes");
export const Star = coloredIcon("star-1", "Star");
export const LuSettings = coloredIcon("cog", "LuSettings");
export const Inbox = coloredIcon("inbox-tray-1", "Inbox");
export const StickyNote = coloredIcon("new-sticky-note", "StickyNote");
export const Sun = coloredIcon("sun-cloud", "Sun");
export const Trash2 = coloredIcon("recycle-bin-2", "Trash2");
export const Truck = coloredIcon("shipping-truck", "Truck");
export const User = coloredIcon("user-circle-single", "User");
export const UserCheck = coloredIcon("user-check-validate", "UserCheck");
export const UserRound = coloredIcon("user-circle-single", "UserRound");
export const UserPlus = coloredIcon("user-add-plus", "UserPlus");
export const LuUsersRound = coloredIcon("user-multiple-group", "LuUsersRound");
export const Wallet = coloredIcon("wallet", "Wallet");
export const Warehouse = coloredIcon("warehouse-1", "Warehouse");
export const AlertTriangle = coloredIcon("warning-triangle", "AlertTriangle");
const CloseIcon: Icon = (props) => {
  const { size, width, height, ...rest } = props;
  return createElement(
    "svg",
    {
      ...rest,
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      width: width ?? size ?? "1em",
      height: height ?? size ?? "1em",
      fill: "none",
    },
    createElement("path", {
      d: "m6 6 12 12",
      stroke: "#2456B8",
      strokeWidth: 2.5,
      strokeLinecap: "round",
    }),
    createElement("path", {
      d: "M18 6 6 18",
      stroke: "#18B879",
      strokeWidth: 2.5,
      strokeLinecap: "round",
    })
  );
};
CloseIcon.displayName = "CloseIcon";
export const X = CloseIcon;
export const XIcon = CloseIcon;
export const FaAngleDown = coloredIcon("arrow-down-2", "FaAngleDown");
export const HiOutlineMenuAlt2 = coloredIcon("app-store", "HiOutlineMenuAlt2");
