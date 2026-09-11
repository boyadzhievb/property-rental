import { type ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';

interface GroupProps {
  children: ReactNode;
  title?: string;
}

export function SettingsGroup({ children, title }: GroupProps) {
  return (
    <div className="mb-6">
      {title && <div className="text-xs uppercase tracking-wider text-ios-text-secondary font-semibold ml-4 mb-2">{title}</div>}
      <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
        <div className="divide-y divide-ios-border/40">
          {children}
        </div>
      </div>
    </div>
  );
}

interface ItemProps {
  icon: LucideIcon;
  label: string;
  color?: string;
  value?: string;
}

export function SettingsItem({ icon: Icon, label, color = 'bg-ios-blue', value }: ItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
      className="flex items-center p-4 active:bg-ios-gray-light/30 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ios-blue focus-visible:ring-inset focus-visible:outline-none"
    >
      <div className={`w-8 h-8 rounded-lg ${color} text-white flex items-center justify-center mr-4`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 font-medium text-ios-text">{label}</div>
      {value && <div className="text-ios-text-secondary mr-2">{value}</div>}
      <ChevronRight className="text-ios-border" size={20} />
    </div>
  );
}
