import { MenuIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
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
}

export function MobileNav({ items, socials, email, currentPath }: MobileNavProps) {
  const links = [...items, { label: "Liên hệ", href: "/contact" }]
  const isActive = (href: string) => currentPath === href || currentPath.startsWith(`${href}/`)

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Mở menu">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className="sr-only">Các trang của website</SheetDescription>
        </SheetHeader>
        <nav aria-label="Menu di động" className="flex flex-col px-4">
          {links.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "border-b py-3 font-heading text-2xl font-bold [font-stretch:115%]",
                isActive(item.href) ? "text-primary" : "text-foreground"
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-4 p-4">
          <Separator />
          <a href={`mailto:${email}`} className="text-sm font-medium underline-offset-4 hover:underline">
            {email}
          </a>
          {socials.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {socials.map((s) => (
                <Button key={s.id} variant="outline" size="icon" asChild>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                    <span dangerouslySetInnerHTML={{ __html: s.iconSvg }} />
                  </a>
                </Button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
