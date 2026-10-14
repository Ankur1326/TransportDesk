import {
  ShieldCheck,
  Clock,
  UserCheck,
  Lock,
  MessageSquare,
  Truck,
  PackageSearch,
  Warehouse,
  Zap,
  Map,
  PackageCheck,
  FileText,
  CheckCircle2,
  type Icon,
} from "@/components/icons";

const ICONS: Record<string, Icon> = {
  ShieldCheck,
  Clock,
  UserCheck,
  Lock,
  MessageSquare,
  Truck,
  PackageSearch,
  Warehouse,
  Zap,
  Map,
  PackageCheck,
  FileText,
  CheckCircle2,
};

/** Resolves an icon name string (from data files) to its outline component. */
export function getIcon(name: string): Icon {
  return ICONS[name] ?? Truck;
}