/**
 * Bệ quay của một người chơi đã nhận tên.
 * - Quay: gọi /draw (kết quả đã chia sẵn trên máy chủ) đồng thời cho tên lật liên tục, chậm dần, rồi dừng ở kết quả.
 *   Vòng quay chỉ dùng tên của MỌI NGƯỜI TRỪ MÌNH, không phải "tên còn trong rổ", nên nhìn vòng quay không đoán được ai đã bị chọn.
 * - Mở lại trang: tên người được tặng ẩn sẵn (đề phòng người bên cạnh nhìn màn hình), bấm "Hiện tên".
 * - Giảm chuyển động: bỏ vòng lật, hiện kết quả ngay.
 */
import { useEffect, useRef, useState } from 'react';
import { CalendarIcon, EyeIcon, EyeOffIcon, GiftIcon, KeyRoundIcon, SaveIcon, SparklesIcon, WalletIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { formatCode, SANTA_LIMITS, type MeView, type PublicRoom } from '@/lib/play/santa';
import { fmt } from '@/lib/utils';
import { api, errorText, type Labels, type Seat } from './api';
import { CopyButton, ErrorAlert, OrbiMark } from './parts';

const SPIN_MIN_MS = 2600;

export function Pad({ room, me, seat, labels: L, intl, onDrawn, onLost }: {
  room: PublicRoom;
  me: MeView;
  seat: Seat;
  labels: Labels;
  intl: string;
  onDrawn: (me: MeView) => void;
  onLost: () => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'landed'>(me.receiver ? 'landed' : 'idle');
  const [shown, setShown] = useState(me.receiver ? undefined : '');
  const [flip, setFlip] = useState(0);
  const [hidden, setHidden] = useState(Boolean(me.receiver));
  const [burst, setBurst] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const announce = useRef<HTMLParagraphElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const others = room.people.filter((p) => p.id !== me.id).map((p) => p.name);

  const spin = async () => {
    if (phase !== 'idle') return;
    setError('');
    setPhase('spinning');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const started = performance.now();
    let result: MeView | undefined;
    let failed = false;
    let delay = 55;
    let last = '';

    const request = api.draw(room.code, seat.token).then((res) => {
      if (res.ok) result = res.me;
      else {
        failed = true;
        setError(errorText(L, res.error, { code: room.code }));
        if (res.error === 'unauthorized') onLost();
      }
    });

    const land = (next: MeView) => {
      setShown(next.receiver!.name);
      setFlip((f) => f + 1);
      setPhase('landed');
      setHidden(false);
      setBurst(!reduced);
      onDrawn(next);
      requestAnimationFrame(() => announce.current?.focus());
    };

    if (reduced) {
      await request;
      if (result?.receiver) land(result);
      else setPhase('idle');
      return;
    }

    const tick = () => {
      if (failed) {
        setPhase('idle');
        setShown('');
        return;
      }
      const elapsed = performance.now() - started;
      if (result?.receiver && elapsed >= SPIN_MIN_MS && delay >= 240) return land(result);
      // Tên ngẫu nhiên khác tên vừa hiện, nhịp chậm dần như bảng lật dừng lại
      let name = others[Math.floor(Math.random() * others.length)]!;
      if (others.length > 1) while (name === last) name = others[Math.floor(Math.random() * others.length)]!;
      last = name;
      setShown(name);
      setFlip((f) => f + 1);
      if (elapsed > SPIN_MIN_MS * 0.45) delay = Math.min(delay * 1.13, 320);
      timer.current = setTimeout(tick, delay);
    };
    tick();
    await request;
  };

  const receiver = me.receiver;
  const landed = phase === 'landed' && receiver;
  const display = landed ? receiver.name : shown;
  const date = room.date ? new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${room.date}T00:00:00`)) : '';

  return (
    <div className="flex flex-col gap-6">
      <Card className="santa-pad gap-6 border-0 py-8">
        <CardHeader className="items-center text-center">
          <OrbiMark size={64} className={landed ? 'santa-pop' : undefined} />
          <p className="mono">{landed ? L.revealCode : L.spinCode}</p>
          <CardTitle className="font-heading text-2xl font-bold">{landed ? L.revealLead : fmt(L.hello, { name: me.name })}</CardTitle>
          {!landed && <CardDescription className="max-w-prose text-balance">{L.spinText}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <div className="santa-reel w-full max-w-xl" data-landed={landed ? '' : undefined}>
            <p
              key={flip}
              ref={announce}
              tabIndex={-1}
              className="santa-reel__name outline-none"
              data-flip={phase === 'spinning' ? '' : undefined}
              data-idle={!display ? '' : undefined}
              data-hidden={landed && hidden ? '' : undefined}
              aria-live={landed ? 'polite' : 'off'}
            >
              {landed && hidden ? <span className="sr-only">{L.hiddenName}</span> : null}
              <span aria-hidden={landed && hidden ? true : undefined}>{display || '? ? ?'}</span>
            </p>
            {burst && (
              <span className="santa-burst" aria-hidden="true">
                <i></i>
                <i></i>
                {Array.from({ length: 12 }, (_, i) => (
                  <b key={i} style={{ ['--a' as string]: `${i * 30}deg`, animationDelay: `${(i % 3) * 60}ms` }}></b>
                ))}
              </span>
            )}
          </div>

          {!landed ? (
            <Button type="button" variant="launch" size="pill" className="h-14 px-10 text-base" onClick={spin} disabled={phase === 'spinning'} aria-busy={phase === 'spinning' || undefined}>
              {phase === 'spinning' ? <Spinner data-icon="inline-start" aria-label={L.spinning} /> : <SparklesIcon data-icon="inline-start" />}
              {phase === 'spinning' ? L.spinning : L.spin}
            </Button>
          ) : (
            <Button type="button" variant="launch-outline" size="pill" onClick={() => setHidden(!hidden)} aria-pressed={!hidden}>
              {hidden ? <EyeIcon data-icon="inline-start" /> : <EyeOffIcon data-icon="inline-start" />}
              {hidden ? L.show : L.hide}
            </Button>
          )}
          <ErrorAlert>{error}</ErrorAlert>
        </CardContent>

        {landed && (
          <CardFooter className="flex-col gap-4 border-t pt-6 text-center">
            {!hidden && (
              <blockquote className="max-w-prose text-balance">
                {receiver.wish ? (
                  <>
                    <span className="mono mb-2 block">{fmt(L.theirWish, { name: receiver.name })}</span>
                    <span className="text-lg whitespace-pre-line">{receiver.wish}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">{fmt(L.noWish, { name: receiver.name })}</span>
                )}
              </blockquote>
            )}
            <div className="flex flex-wrap justify-center gap-2">
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
            </div>
            <p className="santa-pad__secret">
              <GiftIcon aria-hidden="true" />
              {L.keepSecret}
            </p>
          </CardFooter>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <WishCard room={room} me={me} seat={seat} labels={L} onSaved={onDrawn} onLost={onLost} />
        {seat.recovery && <RecoveryCard code={seat.recovery} labels={L} />}
      </div>
    </div>
  );
}

function WishCard({ room, me, seat, labels: L, onSaved, onLost }: {
  room: PublicRoom;
  me: MeView;
  seat: Seat;
  labels: Labels;
  onSaved: (me: MeView) => void;
  onLost: () => void;
}) {
  const [wish, setWish] = useState(me.wish);
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');
  const max = SANTA_LIMITS.wish;
  const length = [...wish].length;
  const dirty = wish.trim() !== me.wish;

  const save = async () => {
    if (length > max) return setError(fmt(L.errWish, { max }));
    setError('');
    setState('saving');
    const res = await api.wish(room.code, seat.token, wish);
    if (res.ok) {
      setState('saved');
      setWish(res.me.wish);
      onSaved(res.me);
      return;
    }
    setState('idle');
    setError(errorText(L, res.error, { code: room.code }));
    if (res.error === 'unauthorized') onLost();
  };

  return (
    <Card>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Field data-invalid={error ? true : undefined}>
            <div className="flex items-baseline justify-between gap-4">
              <FieldLabel htmlFor="santa-wish">{L.wishLabel}</FieldLabel>
              <span className="mono muted tabular-nums" aria-hidden="true">
                {length}/{max}
              </span>
            </div>
            <Textarea
              id="santa-wish"
              value={wish}
              onChange={(e) => {
                setWish(e.target.value);
                setState('idle');
              }}
              maxLength={max}
              rows={4}
              placeholder={L.wishPlaceholder}
              aria-invalid={error ? true : undefined}
              className="min-h-28 rounded-xl bg-card px-4 py-3 md:text-base"
            />
            <FieldDescription>{L.wishHint}</FieldDescription>
            {error && <FieldError>{error}</FieldError>}
          </Field>
          <Button type="submit" variant="outline" className="self-start" disabled={!dirty || state === 'saving'}>
            {state === 'saving' ? <Spinner data-icon="inline-start" aria-label={L.wishSave} /> : <SaveIcon data-icon="inline-start" />}
            {state === 'saved' && !dirty ? L.wishSaved : L.wishSave}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RecoveryCard({ code, labels: L }: { code: string; labels: Labels }) {
  return (
    <Card>
      <CardHeader>
        <p className="mono muted">
          <KeyRoundIcon aria-hidden="true" className="santa-inline-icon" /> {L.recoveryTitle}
        </p>
        <CardTitle className="santa-code text-3xl" aria-label={code.split('').join(' ')}>
          {formatCode(code)}
        </CardTitle>
        <CardDescription>{L.recoveryText}</CardDescription>
      </CardHeader>
      <CardFooter>
        <CopyButton value={code} label={L.copy} labels={L} />
      </CardFooter>
    </Card>
  );
}
