/**
 * Phòng vừa tạo: mã phòng, link mời, (chế độ Link riêng) link cá nhân từng người, link quản lý.
 * Link riêng chỉ có nút Sao chép, KHÔNG có link bấm được: người tạo lỡ bấm là dùng mất lượt mở của người ta.
 */
import { useEffect, useState } from 'react';
import { ArrowUpRightIcon, Share2Icon, ShieldAlertIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, FieldSeparator } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCode } from '@/lib/play/santa';
import { fmt } from '@/lib/utils';
import { api, roomUrl, type Labels } from './api';
import type { Created as CreatedRoom } from './CreateForm';
import { CopyButton, CopyField, OrbiMark } from './parts';
import { InviteList } from './InviteList';

export function Created({ room, labels: L, onEnter }: { room: CreatedRoom; labels: Labels; onEnter: () => void }) {
  const { code, adminToken, title, joinMode } = room;
  const invite = roomUrl(code);
  const adminUrl = roomUrl(code, { admin: adminToken });
  const [people, setPeople] = useState<{ id: number; name: string; key: string }[]>();
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (joinMode !== 'invite') return;
    void api.admin(code, adminToken).then((res) => {
      if (!res.ok) return;
      const names = new Map(res.admin.people.map((p) => [p.id, p.name]));
      setPeople((res.admin.invites ?? []).map((i) => ({ id: i.id, name: names.get(i.id) ?? '', key: i.key })));
    });
  }, [code, adminToken, joinMode]);

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader className="justify-items-center text-center">
        <OrbiMark size={72} className="santa-pop" />
        <p className="mono muted">{L.createdCode}</p>
        <CardTitle className="font-heading text-3xl font-bold">{L.createdTitle}</CardTitle>
        <CardDescription className="max-w-prose text-base text-balance">{L.createdText}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="mono muted">{L.roomCode}</p>
            <p className="santa-code" aria-label={code.split('').join(' ')}>
              {formatCode(code)}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <CopyButton value={code} label={L.copy} labels={L} />
              {canShare && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.share({ title, text: fmt(L.shareText, { title, code: formatCode(code) }), url: invite }).catch(() => {})}
                >
                  <Share2Icon data-icon="inline-start" />
                  {L.share}
                </Button>
              )}
            </div>
          </div>

          {joinMode === 'open' ? (
            <CopyField id="santa-invite" label={L.inviteLink} value={invite} labels={L} />
          ) : people ? (
            <InviteList labels={L} code={code} people={people} />
          ) : (
            <Skeleton className="h-48 w-full rounded-xl" />
          )}

          <FieldSeparator />

          <CopyField id="santa-admin" label={L.adminLink} value={adminUrl} labels={L} />
          <Alert>
            <ShieldAlertIcon />
            <AlertDescription>{L.adminWarn}</AlertDescription>
          </Alert>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-center border-t pt-6">
        <Button type="button" variant="launch" size="pill" onClick={onEnter}>
          {L.enterRoom}
          <ArrowUpRightIcon data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  );
}
