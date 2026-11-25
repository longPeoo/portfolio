/**
 * Một phòng Secret Santa (?code=XXXXXX).
 *
 * Luồng:
 * 1. Tải thông tin công khai của phòng.
 * 2. Máy này đã có chỗ (localStorage play:santa:<MÃ>) → hỏi /me. Không có:
 *    - mở bằng link riêng (#join=…) → vào luôn bằng mã cá nhân;
 *    - chế độ Mã chung → chọn tên (xác nhận "Bạn là Lan?");
 *    - chế độ Link riêng → nhập mã 8 ký tự.
 *    Đã nhận tên trên máy khác → nhập mã xem lại (cùng một ô mã).
 * 3. Có token quản lý → thêm bảng điều khiển.
 * Quay lại tab (visibilitychange) → tải lại tiến độ.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeftIcon, CalendarIcon, KeyRoundIcon, LinkIcon, LogOutIcon, SearchIcon, ShieldCheckIcon, UsersIcon, WalletIcon } from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { formatCode, nameKey, RECOVERY_LENGTH, type AdminView, type MeView, type PublicPerson, type PublicRoom } from '@/lib/play/santa';
import { fmt } from '@/lib/utils';
import { api, errorText, roomUrl, store, type ClientError, type Labels, type Seat } from './api';
import { AdminPanel } from './AdminPanel';
import { Pad } from './Pad';
import { CodeInput, CopyButton, ErrorAlert, OrbiMark } from './parts';

export function Room({ code, join, labels: L, intl, onLeave }: { code: string; join?: string; labels: Labels; intl: string; onLeave: () => void }) {
  const [room, setRoom] = useState<PublicRoom>();
  const [fatal, setFatal] = useState<ClientError>();
  const [seat, setSeat] = useState<Seat>();
  const [me, setMe] = useState<MeView>();
  const [adminToken, setAdminToken] = useState<string>();
  const [admin, setAdmin] = useState<AdminView>();
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);

  const loadRoom = useCallback(async () => {
    const res = await api.room(code);
    if (res.ok) setRoom(res.room);
    else if (res.error === 'not_found') setFatal('not_found');
    return res;
  }, [code]);

  const loadAdmin = useCallback(async (token: string | undefined) => {
    if (!token) return;
    const res = await api.admin(code, token);
    if (res.ok) setAdmin(res.admin);
    else if (res.error === 'unauthorized') {
      store.setAdmin(code, undefined);
      setAdminToken(undefined);
    }
  }, [code]);

  const seated = useCallback(
    (result: { token: string; recovery: string; me: MeView }, title?: string) => {
      const next: Seat = { id: result.me.id, token: result.token, recovery: result.recovery };
      store.setSeat(code, next);
      if (title) store.remember({ code, title, role: 'member' });
      setSeat(next);
      setMe(result.me);
      setNotice('');
      void loadRoom();
    },
    [code, loadRoom],
  );

  const lost = useCallback(() => {
    store.setSeat(code, undefined);
    setSeat(undefined);
    setMe(undefined);
    setNotice(L.errSession);
    void loadRoom();
  }, [code, L, loadRoom]);

  // Lần đầu mở phòng
  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await loadRoom();
      if (!alive) return;
      if (!res.ok) {
        if (res.error !== 'not_found') setFatal(res.error);
        return setReady(true);
      }
      store.remember({ code, title: res.room.title, role: 'member' });
      const token = store.admin(code);
      setAdminToken(token);
      const own = store.seat(code);

      if (own) {
        const m = await api.me(code, own.token);
        if (!alive) return;
        if (m.ok) {
          setSeat(own);
          setMe(m.me);
        } else if (m.error === 'unauthorized') {
          store.setSeat(code, undefined);
          setNotice(L.errSession);
        }
      } else if (join) {
        // Link riêng: vào luôn bằng mã cá nhân (máy này chưa gắn với ai trong phòng)
        const e = await api.enter(code, join);
        if (!alive) return;
        if (e.ok) seated(e, res.room.title);
        else setNotice(errorText(L, e.error, { code }));
      }
      await loadAdmin(token);
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Quay lại tab → cập nhật tiến độ
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void loadRoom();
      void loadAdmin(adminToken);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadRoom, loadAdmin, adminToken]);

  if (fatal === 'not_found')
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia>
            <OrbiMark size={88} />
          </EmptyMedia>
          <EmptyTitle className="font-heading text-xl font-bold">{formatCode(code)}</EmptyTitle>
          <EmptyDescription>{errorText(L, 'not_found', { code: formatCode(code) })}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="launch" size="pill" onClick={onLeave}>
            <ArrowLeftIcon data-icon="inline-start" />
            {L.otherRoom}
          </Button>
        </EmptyContent>
      </Empty>
    );

  if (!room || !ready)
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label={L.loading}>
        {fatal ? <ErrorAlert>{errorText(L, fatal, { code })}</ErrorAlert> : null}
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <RoomHeader room={room} labels={L} intl={intl} />
      <ErrorAlert>{notice}</ErrorAlert>

      {me && seat ? (
        <Pad room={room} me={me} seat={seat} labels={L} intl={intl} onDrawn={setMe} onLost={lost} />
      ) : room.joinMode === 'open' ? (
        <NamePicker room={room} labels={L} onSeated={(r) => seated(r, room.title)} />
      ) : (
        <KeyCard room={room} labels={L} onSeated={(r) => seated(r, room.title)} />
      )}

      {adminToken && admin && (
        <AdminPanel
          code={code}
          token={adminToken}
          admin={admin}
          labels={L}
          onChange={setAdmin}
          onRefresh={async () => {
            await Promise.all([loadRoom(), loadAdmin(adminToken)]);
          }}
          onRemoved={onLeave}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onLeave}>
          <ArrowLeftIcon data-icon="inline-start" />
          {L.otherRoom}
        </Button>
        {seat && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost">
                <LogOutIcon data-icon="inline-start" />
                {L.signOut}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{L.signOutTitle}</AlertDialogTitle>
                <AlertDialogDescription>{L.signOutText}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{L.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    store.setSeat(code, undefined);
                    setSeat(undefined);
                    setMe(undefined);
                  }}
                >
                  {L.signOutOk}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

/* ---------------- Thông tin phòng ---------------- */

function RoomHeader({ room, labels: L, intl }: { room: PublicRoom; labels: Labels; intl: string }) {
  const total = room.people.length;
  const drawn = room.people.filter((p) => p.drawn).length;
  const dateFmt = new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'long', year: 'numeric' });
  const date = room.date ? dateFmt.format(new Date(`${room.date}T00:00:00`)) : '';
  return (
    <Card>
      <CardHeader>
        <p className="mono muted">ROOM · {formatCode(room.code)}</p>
        <CardTitle className="font-heading text-3xl leading-tight font-bold text-balance">{room.title}</CardTitle>
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="telemetry">
            <UsersIcon data-icon="inline-start" />
            {fmt(L.fPeopleCount, { n: total })}
          </Badge>
          {room.budget && (
            <Badge variant="telemetry">
              <WalletIcon data-icon="inline-start" />
              {L.budget} · {room.budget}
            </Badge>
          )}
          {date && (
            <Badge variant="telemetry">
              <CalendarIcon data-icon="inline-start" />
              {L.date} · {date}
            </Badge>
          )}
          {room.joinMode === 'invite' && (
            <Badge variant="telemetry">
              <ShieldCheckIcon data-icon="inline-start" />
              {L.ruleInvite}
            </Badge>
          )}
          {room.noMutual && <Badge variant="telemetry">{L.ruleNoMutual}</Badge>}
          {room.exclusions > 0 && <Badge variant="telemetry">{fmt(L.ruleExclusions, { n: room.exclusions })}</Badge>}
        </div>
      </CardHeader>
      {room.notes && (
        <CardContent>
          <p className="mono muted mb-1">{L.rules}</p>
          <p className="whitespace-pre-line">{room.notes}</p>
        </CardContent>
      )}
      <Separator />
      <CardFooter className="flex-col items-stretch gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-semibold tabular-nums">{fmt(L.progress, { n: drawn, total })}</span>
          <span className="text-sm text-muted-foreground">{fmt(L.expires, { date: dateFmt.format(new Date(room.expiresAt)) })}</span>
        </div>
        <Progress value={total ? (drawn / total) * 100 : 0} aria-label={fmt(L.progress, { n: drawn, total })} />
        {room.joinMode === 'open' && (
          <div className="pt-2">
            <CopyButton value={roomUrl(room.code)} label={L.inviteLink} labels={L} />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

/* ---------------- Chế độ Mã chung: chọn tên ---------------- */

function NamePicker({ room, labels: L, onSeated }: { room: PublicRoom; labels: Labels; onSeated: (r: { token: string; recovery: string; me: MeView }) => void }) {
  const [query, setQuery] = useState('');
  const [pick, setPick] = useState<PublicPerson>();
  const [taken, setTaken] = useState<PublicPerson>();
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const list = useMemo(() => {
    const q = nameKey(query);
    return q ? room.people.filter((p) => nameKey(p.name).includes(q)) : room.people;
  }, [query, room.people]);

  const claim = async (p: PublicPerson) => {
    setBusy(true);
    setError('');
    const res = await api.claim(room.code, p.id);
    setBusy(false);
    setPick(undefined);
    if (res.ok) return onSeated(res);
    setError(errorText(L, res.error, { code: room.code }));
  };

  return (
    <Card>
      <CardHeader>
        <p className="mono muted">{L.whoCode}</p>
        <CardTitle className="font-heading text-2xl font-bold">{L.whoTitle}</CardTitle>
        <CardDescription>{L.whoText}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {room.people.length > 12 && (
          <InputGroup className="h-11 max-w-sm rounded-xl bg-card">
            <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L.colName} aria-label={L.colName} type="search" />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
        )}
        <div className="santa-names">
          {list.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant="outline"
              className="h-auto min-h-12 justify-between rounded-xl px-4 py-2 text-left whitespace-normal"
              onClick={() => (p.claimed ? (setTaken(p), setRecoverOpen(true)) : setPick(p))}
              disabled={busy}
            >
              <span className="font-semibold">{p.name}</span>
              {p.claimed && <Badge variant="queued">{L.taken}</Badge>}
            </Button>
          ))}
        </div>
        <ErrorAlert>{error}</ErrorAlert>
      </CardContent>
      <CardFooter>
        <Button type="button" variant="link" className="px-0" onClick={() => (setTaken(undefined), setRecoverOpen(true))}>
          <KeyRoundIcon data-icon="inline-start" />
          {L.haveCode}
        </Button>
      </CardFooter>

      <AlertDialog open={Boolean(pick)} onOpenChange={(open) => !open && setPick(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pick && fmt(L.confirmTitle, { name: pick.name })}</AlertDialogTitle>
            <AlertDialogDescription>{L.confirmText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{L.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pick) void claim(pick);
              }}
              disabled={busy}
            >
              {busy && <Spinner data-icon="inline-start" aria-label={L.confirmOk} />}
              {L.confirmOk}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={recoverOpen} onOpenChange={setRecoverOpen}>
        <DialogContent className="grid-cols-[minmax(0,1fr)]">
          <DialogHeader>
            <DialogTitle>{taken ? fmt(L.recoverTitle, { name: taken.name }) : L.haveCode}</DialogTitle>
            <DialogDescription>{L.recoverText}</DialogDescription>
          </DialogHeader>
          <KeyForm room={room} labels={L} onSeated={onSeated} id="santa-recover" />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------------- Chế độ Link riêng: nhập mã ---------------- */

function KeyCard({ room, labels: L, onSeated }: { room: PublicRoom; labels: Labels; onSeated: (r: { token: string; recovery: string; me: MeView }) => void }) {
  return (
    <Card>
      <CardHeader>
        <p className="mono muted">{L.whoCode}</p>
        <CardTitle className="font-heading text-2xl font-bold">{L.keyTitle}</CardTitle>
        <CardDescription>{L.keyText}</CardDescription>
      </CardHeader>
      <CardContent>
        <KeyForm room={room} labels={L} onSeated={onSeated} id="santa-key" />
      </CardContent>
    </Card>
  );
}

function KeyForm({ room, labels: L, onSeated, id }: { room: PublicRoom; labels: Labels; onSeated: (r: { token: string; recovery: string; me: MeView }) => void; id: string }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (value = key) => {
    if (value.length !== RECOVERY_LENGTH || busy) return setError(value.length !== RECOVERY_LENGTH ? L.errRecovery : '');
    setBusy(true);
    setError('');
    const res = await api.enter(room.code, value);
    setBusy(false);
    if (res.ok) return onSeated(res);
    setError(errorText(L, res.error, { code: room.code }));
  };

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={id}>{L.keyLabel}</FieldLabel>
        <CodeInput
          id={id}
          length={RECOVERY_LENGTH}
          value={key}
          invalid={Boolean(error)}
          describedBy={`${id}-hint`}
          onChange={(v) => {
            setKey(v);
            setError('');
          }}
          onComplete={(v) => void submit(v)}
        />
        {error ? <FieldError id={`${id}-hint`}>{error}</FieldError> : <FieldDescription id={`${id}-hint`}>{L.keyHint}</FieldDescription>}
      </Field>
      <Button type="submit" variant="launch" size="pill" className="self-start" disabled={busy}>
        {busy ? <Spinner data-icon="inline-start" aria-label={L.keySubmit} /> : <LinkIcon data-icon="inline-start" />}
        {L.keySubmit}
      </Button>
    </form>
  );
}
