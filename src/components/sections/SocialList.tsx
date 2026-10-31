import { ExternalLinkIcon } from "lucide-react"

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import type { Social } from "@/lib/site"

/** Danh sách mạng xã hội — render tĩnh lúc build, không cần JS phía trình duyệt. */
export function SocialList({ socials }: { socials: Social[] }) {
  return (
    <ItemGroup className="grid gap-2 sm:grid-cols-2">
      {socials.map((s) => (
        <Item key={s.id} variant="outline" asChild>
          <a href={s.url} target="_blank" rel="noopener noreferrer">
            <ItemMedia variant="icon">
              <span dangerouslySetInnerHTML={{ __html: s.iconSvg }} />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{s.label}</ItemTitle>
              <ItemDescription>{new URL(s.url).host.replace(/^www\./, "")}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ExternalLinkIcon className="text-muted-foreground" />
            </ItemActions>
          </a>
        </Item>
      ))}
    </ItemGroup>
  )
}
