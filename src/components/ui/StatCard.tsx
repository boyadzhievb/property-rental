import { type ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  value: number;
  label: string;
}

export default function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="bg-ios-card rounded-3xl p-5 shadow-sm border border-black/[0.04]">
      <div className="mb-2">{icon}</div>
      <div className="text-3xl font-bold mb-1 text-ios-text">{value}</div>
      <div className="text-ios-text-secondary font-medium">{label}</div>
    </div>
  );
}
