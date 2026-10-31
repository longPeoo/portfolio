import { MenuIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { NavItem, Social } from "@/lib/site"

interface MobileNavProps {
  items: NavItem[]
  socials: Social[]
  email: string
  currentPath: string
  /** Chữ lấy từ src/i18n (MissionBar.astro truyền vào) */
  labels: { contact: string; openMenu: string; closeMenu: string; mainMenu: string }
}

/** Menu toàn màn hình trên mobile: mở dạng vòng tròn từ nút menu (CSS `.menu-sheet`), các mục bay vào lần lượt. */
export function MobileNav({ items, socials, email, currentPath, labels }: MobileNavProps) {
  const links = [...items, { label: labels.contact, href: "/contact" }]
  const isActive = (href: string) => currentPath === href || currentPath.startsWith(`${href}/`)

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label={labels.openMenu}>
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="menu-sheet gap-0 bg-background data-[side=right]:border-l-0 px-[var(--gutter)] pt-[calc(var(--header-h)+24px)] pb-8 data-[side=right]:w-full data-[side=right]:sm:max-w-none"
      >
        {/* Nút đóng nằm đúng chỗ nút menu → trông như nút menu biến thành dấu X */}
        <SheetClose asChild>
          <Button
            variant="secondary"
            size="icon-lg"
            className="absolute top-[calc((var(--header-h)-2.25rem)/2)] right-[var(--gutter)] rounded-full"
            aria-label={labels.closeMenu}
          >
            <XIcon />
          </Button>
        </SheetClose>

        <SheetHeader className="sr-only">
          <SheetTitle>{labels.mainMenu}</SheetTitle>
          <SheetDescription>{labels.mainMenu}</SheetDescription>
        </SheetHeader>

        <nav aria-label={labels.mainMenu}>
          <ol>
            {links.map((item, i) => (
              <li
                key={item.href}
                className="animate-in border-b duration-500 ease-[var(--ease-spring)] fade-in-0 slide-in-from-bottom-6"
                style={{ animationDelay: `${120 + i * 55}ms`, animationFillMode: "both" }}
              >
                <a
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "flex items-baseline gap-3.5 py-3.5 font-heading text-[clamp(2rem,9vw,3rem)] leading-[1.1] font-bold font-stretch-112%",
                    isActive(item.href) && "text-primary"
                  )}
                >
                  <span className="mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mono mt-auto flex flex-wrap items-center gap-4 text-muted-foreground">
          {socials.map((s) => (
            <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="text-[1.4em]">
              <span dangerouslySetInnerHTML={{ __html: s.iconSvg }} />
            </a>
          ))}
          <a href={`mailto:${email}`}>{email}</a>
        </div>
      </SheetContent>
    </Sheet>
  )
}
