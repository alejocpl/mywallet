/**
 * Componente del logotipo de MyWallet.
 * Carga el SVG reemplazable desde `BRAND.assets.logo` con respaldo vectorial.
 */
import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { BRAND } from '../../config/brand';

interface BrandLogoProps {
  showTagline?: boolean;
}

export function BrandLogo({ showTagline = false }: BrandLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="flex items-center gap-2.5">
      {!imgFailed ? (
        <img
          src={BRAND.assets.logo}
          alt={BRAND.name}
          onError={() => setImgFailed(true)}
          className="h-9 w-9 rounded-xl object-contain shadow-sm"
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
          <Wallet size={20} />
        </div>
      )}
      <div className="leading-tight">
        <span className="block text-base font-bold tracking-tight text-slate-900">
          {BRAND.name}
        </span>
        {showTagline && (
          <span className="hidden text-[11px] text-slate-500 sm:block">{BRAND.tagline}</span>
        )}
      </div>
    </div>
  );
}
