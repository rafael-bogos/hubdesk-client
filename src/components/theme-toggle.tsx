"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

function toggleTheme() {
  const root = document.documentElement;
  const next = root.classList.contains("dark") ? "light" : "dark";
  root.classList.toggle("dark", next === "dark");
  // Cookie (não localStorage) porque quem decide a classe "dark" no HTML
  // servido é o layout raiz (Server Component, via next/headers cookies()) —
  // isso evita qualquer script de "anti-flash" rodando antes da hidratação.
  document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeToggle({ className }: { className?: string }) {
  return (
    <Button
      variant="outline"
      size="icon"
      className={className}
      aria-label="Alternar tema"
      onClick={toggleTheme}
    >
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
  );
}
