import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Đổi giao diện sáng/tối. Trạng thái ban đầu do script trong <head> đặt (class `dark`). */
export function ThemeToggle() {
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark")
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light")
    } catch {}
  }

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={toggle}
      aria-label="Đổi giao diện sáng/tối"
      className="rounded-full duration-300 ease-[var(--ease-spring)] hover:-rotate-[15deg]"
    >
      {/* Hai icon chồng nhau, xoay/thu nhỏ khi đổi chế độ — dựa vào class `dark` nên không lệch khi hydrate */}
      <span className="grid">
        <SunIcon className="col-start-1 row-start-1 transition-all duration-300 ease-[var(--ease-spring)] dark:scale-50 dark:-rotate-90 dark:opacity-0" />
        <MoonIcon className="col-start-1 row-start-1 scale-50 -rotate-90 opacity-0 transition-all duration-300 ease-[var(--ease-spring)] dark:scale-100 dark:rotate-0 dark:opacity-100" />
      </span>
    </Button>
  )
}
