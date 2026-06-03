/**
 * SelectWithOther — a dropdown of known options plus a fillable "Other…".
 *
 * House rule: prefer dropdowns wherever a field has a known set of values, and
 * always offer a free-text "Other" escape hatch. Works with native <form>
 * submission via a hidden input named `name` carrying the resolved value
 * (the chosen option, or the typed "Other" text).
 */
import { useState } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const OTHER = '__other__';

interface SelectWithOtherProps {
  name?: string;
  options: string[];
  defaultValue?: string;
  placeholder?: string;
  otherLabel?: string;
  required?: boolean;
  triggerClassName?: string;
  onChange?: (value: string) => void;
}

export function SelectWithOther({
  name,
  options,
  defaultValue = '',
  placeholder = 'Select…',
  otherLabel = 'Other…',
  required,
  triggerClassName,
  onChange,
}: SelectWithOtherProps) {
  // If the initial value isn't a known option, treat it as "Other".
  const initialIsOther = defaultValue !== '' && !options.includes(defaultValue);
  const [selected, setSelected] = useState<string>(initialIsOther ? OTHER : defaultValue);
  const [otherText, setOtherText] = useState<string>(initialIsOther ? defaultValue : '');

  const resolved = selected === OTHER ? otherText : selected;

  const handleSelect = (v: string) => {
    setSelected(v);
    onChange?.(v === OTHER ? otherText : v);
  };
  const handleOther = (v: string) => {
    setOtherText(v);
    onChange?.(v);
  };

  return (
    <div className="space-y-2">
      <Select value={selected} onValueChange={handleSelect}>
        <SelectTrigger
          className={
            triggerClassName ??
            'w-full px-6 py-4 h-auto rounded-2xl border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:border-[var(--royal)] font-semibold text-slate-900 text-base'
          }
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
          <SelectItem value={OTHER}>{otherLabel}</SelectItem>
        </SelectContent>
      </Select>

      {selected === OTHER && (
        <Input
          value={otherText}
          onChange={(e) => handleOther(e.target.value)}
          placeholder="Please specify…"
          autoFocus
          className="px-6 py-4 h-auto rounded-2xl border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:border-[var(--royal)] font-semibold text-slate-900 text-base"
        />
      )}

      {/* Hidden input so native <form> submission picks up the resolved value. */}
      {name && <input type="hidden" name={name} value={resolved} required={required} />}
    </div>
  );
}
