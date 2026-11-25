/**
 * Chế độ "Link riêng": danh sách link cá nhân của từng người, chỉ người tạo phòng thấy.
 * Chỉ có nút Sao chép (không có link bấm được) để người tạo không lỡ tay mở mất lượt của người khác.
 */
import { KeyRoundIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/ui/field';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item';
import { formatCode } from '@/lib/play/santa';
import { fmt } from '@/lib/utils';
import { roomUrl, type Labels } from './api';
import { CopyButton } from './parts';

export interface InvitePerson {
  id: number;
  name: string;
  key: string;
  claimed?: boolean;
}

export function InviteList({ labels: L, code, people }: { labels: Labels; code: string; people: InvitePerson[] }) {
  const all = people.map((p) => `${p.name}: ${roomUrl(code, { join: p.key })}`).join('\n');
  return (
    <Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-lg font-bold">{L.inviteTitle}</h3>
        <CopyButton value={all} label={L.copyAll} labels={L} />
      </div>
      <Alert>
        <KeyRoundIcon />
        <AlertTitle>{L.fModeInvite}</AlertTitle>
        <AlertDescription>{L.inviteText}</AlertDescription>
      </Alert>
      <ItemGroup className="gap-2">
        {people.map((p) => (
          <Item key={p.id} variant="outline" size="xs" className="bg-card">
            <ItemContent className="min-w-0">
              <ItemTitle className="font-semibold">{p.name}</ItemTitle>
              <ItemDescription className="font-mono tracking-wider">{formatCode(p.key)}</ItemDescription>
            </ItemContent>
            <ItemActions>
              {p.claimed && <Badge variant="nominal">{L.stClaimed}</Badge>}
              <CopyButton value={roomUrl(code, { join: p.key })} label={fmt(L.copyFor, { name: p.name })} labels={L} iconOnly />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </Field>
  );
}
