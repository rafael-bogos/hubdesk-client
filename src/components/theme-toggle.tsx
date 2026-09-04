"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

function toggleTheme() {
  const root = document.documentElement;
  const next = root.classList.contains("dark") ? "light" : "dark";
  root.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem("theme", next);
  } catch {
    // localStorage indisponível (modo privado, etc.) — a preferência só não persiste entre sessões.
  }
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
