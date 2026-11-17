/**
 * Reglas financieras de la aplicación.
 * Centralizar estos valores permite ajustarlos (o hacerlos configurables por
 * usuario en el futuro) sin tocar la lógica de negocio.
 */
export const FINANCE_RULES = {
  /** % de uso de un presupuesto a partir del cual se emite una advertencia. */
  budgetWarningThreshold: 80,
  /**
   * Regla 50/30/20: distribución recomendada del ingreso mensual.
   *  - needs   (necesidades): vivienda, alimentación, transporte, salud, deudas...
   *  - wants   (deseos): ocio, restaurantes, compras, suscripciones...
   *  - savings (ahorro): aportes a metas / fondo de emergencia.
   */
  distribution: { needs: 50, wants: 30, savings: 20 },
  /** Ratio máximo saludable de pagos de deuda vs ingreso (Debt-to-income). */
  maxDebtToIncome: 36,
  /** Meses que se muestran por defecto en gráficos de tendencia. */
  trendMonths: 6,
} as const;

/** Nombre de la categoría que se usa al registrar pagos de deudas. */
export const DEBT_CATEGORY_NAME = 'Deudas';
