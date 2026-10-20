"use client";

import { useTheme } from "next-themes";
import { buttonClasses } from "@/components/ui/Button";
import { MoonIcon, SunIcon } from "@/components/icons";

/**
 * Sun/moon switch. Both icons are always rendered and CSS shows the right one,
 * so the server HTML matches the client and nothing flickers on load.
 * next-themes saves the choice in localStorage; until then it follows the OS.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={buttonClasses({ variant: "ghost", size: "icon" })}
    >
      <MoonIcon className="size-5 dark:hidden" />
      <SunIcon className="hidden size-5 dark:block" />
    </button>
  );
}
