/**
 * Identidad de marca usada en los reportes generados por el servidor (PDF/Excel).
 * 👉 Para cambiar el logo del PDF coloca un archivo PNG/JPG en
 *    `server/assets/logo.png` (PDFKit no soporta SVG).
 */
import fs from 'node:fs';
import path from 'node:path';

function resolvePdfLogoPath(): string {
  const candidates = [
    path.resolve(__dirname, '../assets/logo.png'),
    path.resolve(__dirname, '../../assets/logo.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[1];
}

export const BRAND = {
  name: 'MyWallet',
  tagline: 'Tus finanzas, bajo control',
  primaryColor: '#2563EB',
  pdfLogoPath: resolvePdfLogoPath(),
} as const;
