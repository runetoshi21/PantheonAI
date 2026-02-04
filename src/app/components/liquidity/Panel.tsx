import type { ReactNode } from "react";

type PanelProps = {
  label: string;
  title: string;
  badge?: ReactNode;
  titleClassName?: string;
  children: ReactNode;
};

export function Panel({
  label,
  title,
  badge,
  titleClassName = "text-lg",
  children,
}: PanelProps) {
  return (
    <section className="panel p-6">
      <div className="panel-header">
        <div>
          <p className="label">{label}</p>
          <h2 className={`mt-1 font-[var(--font-display)] ${titleClassName}`}>
            {title}
          </h2>
        </div>
        {badge ? <span className="badge">{badge}</span> : null}
      </div>
      {children}
    </section>
  );
}
