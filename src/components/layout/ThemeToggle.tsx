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
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Đổi giao diện sáng/tối">
      {/* Hiện icon theo class `dark` để không lệch giữa HTML tĩnh và lúc hydrate */}
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
    </Button>
  )
}
