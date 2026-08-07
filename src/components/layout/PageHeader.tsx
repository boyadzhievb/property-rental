import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export default function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  return (
    <header className="px-5 pt-12 pb-4 bg-ios-bg sticky top-0 z-10 flex items-center justify-between">
      <div>
        {subtitle && (
          <h2 className="text-ios-text-secondary text-sm font-semibold uppercase tracking-wider mb-1">
            {subtitle}
          </h2>
        )}
        <h1 className="text-3xl font-bold text-ios-text">{title}</h1>
      </div>
      {right && <div>{right}</div>}
    </header>
  );
}
