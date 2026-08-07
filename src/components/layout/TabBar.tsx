import { type LucideIcon } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface TabBarProps {
  items: NavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export default function TabBar({ items, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-30">
      <nav className="h-20 bg-ios-bg/80 backdrop-blur-xl border-t border-ios-border/30 px-2 pb-6 pt-2 flex justify-around sm:justify-center sm:gap-16 items-center w-full max-w-screen-xl mx-auto">
        {items.map(item => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors ${
                isActive ? 'text-ios-blue' : 'text-ios-gray hover:text-ios-text-secondary'
              }`}
            >
              <Icon size={24} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
