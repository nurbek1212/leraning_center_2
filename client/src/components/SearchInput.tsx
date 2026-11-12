import { Search } from 'lucide-react';
import { t } from '../i18n';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder }: Props) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        className="input pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t('common.search')}
      />
    </div>
  );
}
