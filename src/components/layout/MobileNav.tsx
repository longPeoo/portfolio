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

interface Language {
  code: string
  label: string
  short: string
  href: string
  active: boolean
}

interface MobileNavProps {
  /** Đường dẫn đã có tiền tố ngôn ngữ (MissionBar.astro) */
  items: NavItem[]
  contactHref: string
  /** Cùng trang ở từng ngôn ngữ (bấm: MissionBar.astro ghi nhớ lựa chọn) */
  languages: Language[]
  socials: Social[]
  email: string
  currentPath: string
  /** Chữ lấy từ src/i18n (MissionBar.astro truyền vào) */
  labels: { contact: string; openMenu: string; closeMenu: string; mainMenu: string; language: string }
}

/** Menu toàn màn hình trên mobile: mở dạng vòng tròn từ nút menu (CSS `.menu-sheet`), các mục bay vào lần lượt. */
export function MobileNav({ items, contactHref, languages, socials, email, currentPath, labels }: MobileNavProps) {
  const links = [...items, { label: labels.contact, href: contactHref }]
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

        {/* Chọn ngôn ngữ: tên viết bằng chính ngôn ngữ đó, đang dùng thì tô mực */}
        <nav aria-label={labels.language} className="mono mt-auto mb-6 flex gap-2">
          {languages.map((l) => (
            <a
              key={l.code}
              href={l.href}
              hrefLang={l.code}
              lang={l.code}
              data-lang={l.code}
              aria-current={l.active ? "true" : undefined}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border px-4 transition-colors",
                l.active ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:border-primary hover:text-primary"
              )}
            >
              <span aria-hidden="true">{l.short}</span>
              <span className="normal-case tracking-normal">{l.label}</span>
            </a>
          ))}
        </nav>

        <div className="mono flex flex-wrap items-center gap-4 text-muted-foreground">
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
