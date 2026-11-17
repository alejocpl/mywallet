/**
 * Configuración centralizada de identidad y recursos gráficos de MyWallet.
 * 👉 Para cambiar el logotipo, nombre, moneda o ilustraciones, edita este archivo
 *    y/o reemplaza los archivos en `client/public/brand/`.
 */
export const BRAND = {
  name: 'MyWallet',
  tagline: 'Administración inteligente de finanzas personales',
  locale: 'es-CO',
  currency: 'COP',
  assets: {
    logo: '/brand/logo.svg',
    heroIllustration: '/brand/hero-illustration.svg',
    emptyState: '/brand/empty-state.svg',
  },
} as const;
