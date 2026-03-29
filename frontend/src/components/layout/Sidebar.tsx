import clsx from "clsx";

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps) {
  return (
    <aside
      className={clsx(
        "flex w-80 shrink-0 flex-col border-r border-border bg-bg-secondary",
        className,
      )}
    >
      <div className="flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}
