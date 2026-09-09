"use client";

import { cn } from "cn";
import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { Input } from "@/components/ui/input";

export function PasswordInput({
  className,
  startIcon,
  ...props
}: React.ComponentProps<"input"> & { startIcon?: React.ReactNode }) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      {startIcon}
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-8", startIcon && "pl-8", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-3.5" />
        ) : (
          <Eye aria-hidden="true" className="size-3.5" />
        )}
      </button>
    </div>
  );
}
