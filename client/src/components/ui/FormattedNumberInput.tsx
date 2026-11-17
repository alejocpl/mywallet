/**
 * Campo numérico con separadores de miles automáticos en tiempo real (`1,000`, `10,000`, `1,000,000`).
 * Internamente emite el valor numérico limpio como string (`'10000'`) para no alterar
 * cálculos ni validaciones existentes.
 */
import type { InputHTMLAttributes } from 'react';
import { formatThousandsInput, parseThousandsInput } from '../../utils/format';

interface FormattedNumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string | number;
  onChange: (cleanValue: string) => void;
  /** Prefijo opcional dentro del input, por ejemplo "COP $". */
  prefix?: string;
}

export function FormattedNumberInput({
  value,
  onChange,
  prefix,
  className = '',
  ...rest
}: FormattedNumberInputProps) {
  const displayValue = formatThousandsInput(value);

  const inputEl = (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={displayValue}
      onChange={(e) => onChange(parseThousandsInput(e.target.value))}
      className={className}
    />
  );

  if (!prefix) return inputEl;

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
        {prefix}
      </span>
      {inputEl}
    </div>
  );
}
