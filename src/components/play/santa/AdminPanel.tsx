/**
 * Bảng điều khiển của người tạo phòng (có token quản lý trên máy này).
 * Thấy: ai đã nhận tên, ai đã quay, (Link riêng) link từng người. KHÔNG thấy ai tặng ai: API không có lệnh nào trả về cặp.
 * Thao tác: gỡ tên (người mất máy + mất mã xem lại), chia lại cặp (khi chưa ai quay), xoá phòng.
 */
import { useState } from 'react';
import { RefreshCwIcon, ShuffleIcon, Trash2Icon, UnlinkIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AdminView } from '@/lib/play/santa';
import { fmt } from '@/lib/utils';
import { api, errorText, roomUrl, store, type Labels } from './api';
import { CopyButton, CopyField, ErrorAlert } from './parts';
import { InviteList } from './InviteList';

export function AdminPanel({ code, token, admin, labels: L, onChange, onRefresh, onRemoved }: {
  code: string;
  token: string;
  admin: AdminView;
  labels: Labels;
  onChange: (admin: AdminView) => void;
  onRefresh: () => Promise<void>;
  onRemoved: () => void;
}) {
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const keys = new Map(admin.invites?.map((i) => [i.id, i.key]));

  const run = async (task: () => ReturnType<typeof api.admin>, done?: string) => {
    setBusy(true);
    setError('');
    setNote('');
    const res = await task();
    setBusy(false);
    if (!res.ok) return setError(res.error === 'unauthorized' ? L.errAdmin : errorText(L, res.error, { code }));
    onChange(res.admin);
    if (done) setNote(done);
    await onRefresh();
  };

  const remove = async () => {
    setBusy(true);
    const res = await api.remove(code, token);
    setBusy(false);
    if (!res.ok && res.error !== 'not_found') return setError(errorText(L, res.error, { code }));
    store.forget(code);
    onRemoved();
  };

  return (
    <Card>
      <CardHeader>
        <p className="mono muted">{L.adminCode}</p>
        <CardTitle className="font-heading text-2xl font-bold">{L.adminTitle}</CardTitle>
        <CardDescription>{L.adminText}</CardDescription>
        <CardAction>
          <Button type="button" variant="outline" size="sm" onClick={() => void onRefresh()} disabled={busy}>
            <RefreshCwIcon data-icon="inline-start" />
            {L.refresh}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{L.colName}</TableHead>
                <TableHead>{L.colStatus}</TableHead>
                <TableHead className="text-right">{L.colAction}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admin.people.map((p) => {
                const key = keys.get(p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium whitespace-normal">{p.name}</TableCell>
                    <TableCell>
                      {p.drawn ? (
                        <Badge variant="nominal">● {L.stDrawn}</Badge>
                      ) : p.claimed ? (
                        <Badge variant="active">● {L.stClaimed}</Badge>
                      ) : (
                        <Badge variant="queued">○ {L.stIdle}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {key && <CopyButton value={roomUrl(code, { join: key })} label={fmt(L.copyFor, { name: p.name })} labels={L} iconOnly />}
                        {p.claimed && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button type="button" variant="ghost" size="sm" disabled={busy}>
                                <UnlinkIcon data-icon="inline-start" />
                                {L.release}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{fmt(L.releaseTitle, { name: p.name })}</AlertDialogTitle>
                                <AlertDialogDescription>{fmt(L.releaseText, { name: p.name })}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{L.cancel}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void run(() => api.release(code, token, p.id))}>{L.release}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {admin.invites && (
          <InviteList
            labels={L}
            code={code}
            people={admin.people.flatMap((p) => (keys.get(p.id) ? [{ id: p.id, name: p.name, key: keys.get(p.id)!, claimed: p.claimed }] : []))}
          />
        )}

        <CopyField id="santa-admin-link" label={L.adminLink} value={roomUrl(code, { admin: token })} labels={L} description={L.adminWarn} />

        <ErrorAlert>{error}</ErrorAlert>
        {note && (
          <p className="text-sm text-muted-foreground" role="status">
            {note}
          </p>
        )}
      </CardContent>
      <Separator />
      <CardFooter className="flex-wrap gap-3">
        {admin.canRedraw && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" disabled={busy}>
                <ShuffleIcon data-icon="inline-start" />
                {L.redraw}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{L.redrawTitle}</AlertDialogTitle>
                <AlertDialogDescription>{L.redrawText}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{L.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={() => void run(() => api.redraw(code, token), L.redrawDone)}>{L.redraw}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" disabled={busy}>
              <Trash2Icon data-icon="inline-start" />
              {L.remove}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{L.removeTitle}</AlertDialogTitle>
              <AlertDialogDescription>{L.removeText}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{L.cancel}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => void remove()}>
                {L.remove}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
