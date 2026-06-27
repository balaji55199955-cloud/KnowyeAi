import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const variantMap: Record<string, string> = {
  primary:
    "bg-[#10B981] hover:bg-[#059669] disabled:bg-gray-100 disabled:text-gray-400 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-50 hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer border-none",
  ghost:
    "bg-transparent text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg transition-all",
  outline:
    "bg-white border border-gray-200 text-gray-800 px-3.5 py-2 rounded-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const sizeMap: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      {...rest}
      className={`${variantMap[variant]} ${sizeMap[size]} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
