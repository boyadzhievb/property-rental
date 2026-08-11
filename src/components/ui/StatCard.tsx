import { type ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  value: number;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export default function StatCard({ icon, value, label, active, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-ios-card rounded-3xl p-5 shadow-sm border transition-all ${
        active ? 'border-ios-blue ring-2 ring-ios-blue/20' : 'border-black/[0.04]'
      } ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
      <div className="mb-2">{icon}</div>
      <div className="text-3xl font-bold mb-1 text-ios-text">{value}</div>
      <div className="text-ios-text-secondary font-medium">{label}</div>
    </div>
  );
}
