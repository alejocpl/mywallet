/**
 * Definición de las vistas navegables desde el menú flotante inferior.
 * El menú se adapta automáticamente a este arreglo.
 */
import type { ViewId } from '../types';

export interface NavItem {
  id: ViewId;
  label: string;
  shortLabel: string;
  description: string;
  icon: 'wallet' | 'arrow-left-right' | 'pie-chart' | 'target' | 'file-bar-chart';
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: '¿Cuánto me queda?',
    shortLabel: 'Disponible',
    description: 'Saldo disponible, distribución 50/30/20 y resumen del mes',
    icon: 'wallet',
  },
  {
    id: 'transactions',
    label: 'Movimientos',
    shortLabel: 'Movimientos',
    description: 'Registrar y consultar ingresos y gastos clasificados',
    icon: 'arrow-left-right',
  },
  {
    id: 'budgets',
    label: 'Presupuestos',
    shortLabel: 'Presupuesto',
    description: 'Límites mensuales por categoría y alertas de consumo',
    icon: 'pie-chart',
  },
  {
    id: 'goals',
    label: 'Metas y Deudas',
    shortLabel: 'Metas',
    description: 'Objetivos de ahorro y plan de reducción de deudas',
    icon: 'target',
  },
  {
    id: 'reports',
    label: 'Reportes',
    shortLabel: 'Reportes',
    description: 'Comparativa con el mes anterior y descarga PDF / Excel',
    icon: 'file-bar-chart',
  },
];
