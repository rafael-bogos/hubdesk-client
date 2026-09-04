"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // resolvedTheme só existe depois que o next-themes lê a preferência real no
  // cliente — undefined no primeiro render evita mismatch de hidratação.
  const mounted = resolvedTheme !== undefined;

  return (
    <Button
      variant="outline"
      size="icon"
      className={className}
      aria-label="Alternar tema"
      disabled={!mounted}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
