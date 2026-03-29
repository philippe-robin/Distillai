import clsx from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className,
  padding = true,
  hover = false,
  onClick,
}: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-border bg-bg-secondary",
        padding && "p-4",
        hover &&
          "cursor-pointer transition-colors duration-150 hover:border-accent/50 hover:bg-bg-tertiary",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
