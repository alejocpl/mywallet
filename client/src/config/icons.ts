/**
 * Registro centralizado de íconos y paletas para categorías y metas.
 * Traduce las claves guardadas en SQLite a componentes de `lucide-react`.
 */
import { createElement } from 'react';
import {
  Briefcase,
  Car,
  Coffee,
  CreditCard,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  MoreHorizontal,
  PiggyBank,
  Plane,
  Shield,
  ShoppingBag,
  Target,
  TrendingUp,
  Tv,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  utensils: Utensils,
  car: Car,
  zap: Zap,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  'credit-card': CreditCard,
  gamepad: Gamepad2,
  coffee: Coffee,
  'shopping-bag': ShoppingBag,
  tv: Tv,
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  gift: Gift,
  'piggy-bank': PiggyBank,
  shield: Shield,
  plane: Plane,
  target: Target,
  wallet: Wallet,
  more: MoreHorizontal,
};

export const ICON_OPTIONS = [
  { key: 'home', label: 'Vivienda' },
  { key: 'utensils', label: 'Alimentación' },
  { key: 'car', label: 'Transporte' },
  { key: 'zap', label: 'Servicios' },
  { key: 'heart-pulse', label: 'Salud' },
  { key: 'graduation-cap', label: 'Educación' },
  { key: 'credit-card', label: 'Deudas / Tarjeta' },
  { key: 'gamepad', label: 'Ocio' },
  { key: 'coffee', label: 'Restaurantes' },
  { key: 'shopping-bag', label: 'Compras' },
  { key: 'tv', label: 'Suscripciones' },
  { key: 'briefcase', label: 'Trabajo' },
  { key: 'laptop', label: 'Tecnología' },
  { key: 'trending-up', label: 'Inversión' },
  { key: 'piggy-bank', label: 'Ahorro' },
  { key: 'shield', label: 'Emergencia' },
  { key: 'plane', label: 'Viajes' },
  { key: 'gift', label: 'Regalos' },
  { key: 'more', label: 'Otro' },
] as const;

export const COLOR_PALETTE = [
  '#2563EB',
  '#059669',
  '#16A34A',
  '#0EA5E9',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#F97316',
  '#EF4444',
  '#14B8A6',
  '#6366F1',
  '#64748B',
] as const;

interface CategoryIconProps {
  name: string;
  size?: number;
  className?: string;
  color?: string;
}

export function CategoryIcon({ name, size = 18, className, color }: CategoryIconProps) {
  const Icon = ICON_MAP[name] ?? MoreHorizontal;
  return createElement(Icon, { size, className, style: color ? { color } : undefined });
}
