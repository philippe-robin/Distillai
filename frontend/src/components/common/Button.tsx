import { forwardRef } from "react";
import clsx from "clsx";
import { Spinner } from "./Spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:bg-blue-700 shadow-sm",
  secondary:
    "bg-bg-tertiary text-text-primary border border-border hover:bg-border active:bg-bg-secondary",
  ghost:
    "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary active:bg-border",
  danger:
    "bg-error/10 text-error border border-error/30 hover:bg-error/20 active:bg-error/30",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-2.5 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      iconRight,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-1 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Spinner size={size === "sm" ? 14 : size === "md" ? 16 : 18} />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
        {iconRight && !isLoading && (
          <span className="shrink-0">{iconRight}</span>
        )}
      </button>
    );
  },
);
