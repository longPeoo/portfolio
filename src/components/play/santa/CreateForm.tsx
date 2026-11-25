/**
 * Form tạo phòng Secret Santa.
 * - Luật kiểm tra = src/lib/play/santa.ts (parseRoom), cùng file Worker dùng → hai bên không lệch.
 * - "Luật chia được không" chạy ngay trên máy người tạo (drawPairs với Math.random, chỉ để kiểm tra);
 *   cặp thật do Worker chia bằng ngẫu nhiên mật mã.
 * - Cặp loại trừ lưu theo tên (khoá so trùng), nên sửa danh sách người không làm lệch cặp.
 */
import { useDeferredValue, useMemo, useState } from 'react';
import { CheckCircle2Icon, LinkIcon, RocketIcon, UsersIcon, XIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from '@/components/ui/item';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { drawPairs, nameKey, parseRoom, SANTA_LIMITS, splitPeople, type JoinMode, type Pair, type RoomIssue } from '@/lib/play/santa';
import { fmt } from '@/lib/utils';
import { api, errorText, issueText, store, type Labels } from './api';
import { ErrorAlert } from './parts';

export interface Created {
  code: string;
  adminToken: string;
  title: string;
  joinMode: JoinMode;
}

type FieldName = RoomIssue['field'];

const mathRand = (max: number) => Math.floor(Math.random() * max);
const input = 'h-11 rounded-xl bg-card px-4 md:text-base';

export function CreateForm({ labels: L, onCreated }: { labels: Labels; onCreated: (room: Created) => void }) {
  const M = SANTA_LIMITS;
  const [title, setTitle] = useState('');
  const [budget, setBudget] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [peopleText, setPeopleText] = useState('');
  const [noMutual, setNoMutual] = useState(false);
  const [joinMode, setJoinMode] = useState<JoinMode>('open');
  const [pairs, setPairs] = useState<[string, string][]>([]);
  const [pickA, setPickA] = useState('');
  const [pickB, setPickB] = useState('');
  const [issue, setIssue] = useState<{ field: FieldName; text: string }>();
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const people = useMemo(() => splitPeople(peopleText), [peopleText]);
  const keys = useMemo(() => people.map(nameKey), [people]);
  const options = useMemo(() => {
    const seen = new Set<string>();
    return people.flatMap((name, i) => (seen.has(keys[i]!) ? [] : (seen.add(keys[i]!), [{ key: keys[i]!, name }])));
  }, [people, keys]);
  const duplicate = useMemo(() => people.find((_, i) => keys.indexOf(keys[i]!) !== i), [people, keys]);

  // Cặp còn hợp lệ (cả hai tên còn trong danh sách) → chỉ số theo `people`
  const pairIdx = useMemo(
    () => pairs.map(([a, b]): Pair => [keys.indexOf(a), keys.indexOf(b)]).filter(([x, y]) => x >= 0 && y >= 0 && x !== y),
    [pairs, keys],
  );
  const nameOf = (key: string) => options.find((o) => o.key === key)?.name ?? key;

  // Kiểm tra luật chia được không (lùi lại khi đang gõ để không giật)
  const check = useDeferredValue({ n: people.length, pairIdx, noMutual, ok: !duplicate && people.length <= M.maxPeople });
  const feasible = useMemo(
    () => (check.ok && check.n >= M.minPeople ? drawPairs(check.n, check.pairIdx, check.noMutual, mathRand) !== null : undefined),
    [check, M.minPeople],
  );

  const invalid = (field: FieldName) => (issue?.field === field ? true : undefined);

  const addPair = () => {
    if (!pickA || !pickB || pickA === pickB) return;
    const exists = pairs.some(([a, b]) => (a === pickA && b === pickB) || (a === pickB && b === pickA));
    if (!exists && pairs.length < M.maxExclusions) setPairs([...pairs, [pickA, pickB]]);
    setPickB('');
  };

  const submit = async () => {
    setFormError('');
    const raw = { title, budget, date, notes, people, exclusions: pairIdx, noMutual, joinMode };
    const parsed = parseRoom(raw);
    if (!parsed.ok) return setIssue({ field: parsed.issue.field, text: issueText(L, parsed.issue) });
    if (feasible === false) return setIssue({ field: 'rules', text: L.errImpossible });
    setIssue(undefined);
    setBusy(true);
    const res = await api.create(parsed.data);
    setBusy(false);
    if (res.ok) {
      store.setAdmin(res.code, res.adminToken);
      store.remember({ code: res.code, title: parsed.data.title, role: 'admin' });
      return onCreated({ code: res.code, adminToken: res.adminToken, title: parsed.data.title, joinMode });
    }
    if (res.error === 'invalid' && res.issue) return setIssue({ field: res.issue.field, text: issueText(L, res.issue) });
    if (res.error === 'impossible') return setIssue({ field: 'rules', text: L.errImpossible });
    setFormError(errorText(L, res.error));
  };

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <p className="mono muted">{L.formCode}</p>
        <CardTitle className="font-heading text-2xl font-bold">{L.tabCreate}</CardTitle>
        <CardDescription>{L.how1Text}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="santa-create"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void submit();
          }}
        >
          <FieldGroup className="gap-8">
            {/* Thông tin phòng */}
            <FieldGroup className="gap-5">
              <Field data-invalid={invalid('title')}>
                <FieldLabel htmlFor="santa-title">{L.fTitle}</FieldLabel>
                <Input
                  id="santa-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={M.title}
                  placeholder={L.fTitlePlaceholder}
                  aria-invalid={invalid('title')}
                  className={input}
                  required
                />
                {invalid('title') && <FieldError>{issue?.text}</FieldError>}
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={invalid('budget')}>
                  <FieldLabel htmlFor="santa-budget">
                    {L.fBudget} <span className="font-normal text-muted-foreground">· {L.optional}</span>
                  </FieldLabel>
                  <Input
                    id="santa-budget"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    maxLength={M.budget}
                    placeholder={L.fBudgetPlaceholder}
                    aria-invalid={invalid('budget')}
                    className={input}
                  />
                  {invalid('budget') && <FieldError>{issue?.text}</FieldError>}
                </Field>
                <Field data-invalid={invalid('date')}>
                  <FieldLabel htmlFor="santa-date">
                    {L.fDate} <span className="font-normal text-muted-foreground">· {L.optional}</span>
                  </FieldLabel>
                  <Input id="santa-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={invalid('date')} className={input} />
                  {invalid('date') && <FieldError>{issue?.text}</FieldError>}
                </Field>
              </div>
              <Field data-invalid={invalid('notes')}>
                <FieldLabel htmlFor="santa-notes">
                  {L.fNotes} <span className="font-normal text-muted-foreground">· {L.optional}</span>
                </FieldLabel>
                <Textarea
                  id="santa-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={M.notes}
                  rows={3}
                  placeholder={L.fNotesPlaceholder}
                  aria-invalid={invalid('notes')}
                  className="min-h-24 rounded-xl bg-card px-4 py-3 md:text-base"
                />
                {invalid('notes') && <FieldError>{issue?.text}</FieldError>}
              </Field>
            </FieldGroup>

            <FieldSeparator />

            {/* Người tham gia */}
            <Field data-invalid={invalid('people') ?? (duplicate ? true : undefined)}>
              <div className="flex items-baseline justify-between gap-4">
                <FieldLabel htmlFor="santa-people">{L.fPeople}</FieldLabel>
                <Badge variant={people.length >= M.minPeople && people.length <= M.maxPeople ? 'nominal' : 'queued'} aria-live="polite">
                  <UsersIcon data-icon="inline-start" />
                  {fmt(L.fPeopleCount, { n: people.length })}
                </Badge>
              </div>
              <Textarea
                id="santa-people"
                value={peopleText}
                onChange={(e) => setPeopleText(e.target.value)}
                rows={8}
                placeholder={L.fPeoplePlaceholder}
                aria-invalid={invalid('people') ?? (duplicate ? true : undefined)}
                aria-describedby="santa-people-hint"
                className="min-h-48 rounded-xl bg-card px-4 py-3 md:text-base"
                spellCheck={false}
              />
              <FieldDescription id="santa-people-hint">{fmt(L.fPeopleHint, { min: M.minPeople, max: M.maxPeople })}</FieldDescription>
              {invalid('people') ? (
                <FieldError>{issue?.text}</FieldError>
              ) : (
                duplicate && <FieldError>{fmt(L.errPeopleDup, { name: duplicate })}</FieldError>
              )}
            </Field>

            <FieldSeparator />

            {/* Luật bốc thăm */}
            <FieldSet>
              <FieldLegend>{L.fRules}</FieldLegend>
              <FieldGroup className="gap-5">
                <Field orientation="horizontal" data-disabled>
                  <FieldContent>
                    <FieldLabel htmlFor="santa-self">{L.fSelf}</FieldLabel>
                    <FieldDescription>{L.fSelfHint}</FieldDescription>
                  </FieldContent>
                  <Switch id="santa-self" checked disabled />
                </Field>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="santa-mutual">{L.fNoMutual}</FieldLabel>
                    <FieldDescription>{L.fNoMutualHint}</FieldDescription>
                  </FieldContent>
                  <Switch id="santa-mutual" checked={noMutual} onCheckedChange={setNoMutual} />
                </Field>

                <Field data-invalid={invalid('exclusions')}>
                  <FieldLabel id="santa-pair-label">{L.fExclude}</FieldLabel>
                  <FieldDescription>{L.fExcludeHint}</FieldDescription>
                  {options.length < 2 ? (
                    <FieldDescription>{L.fExcludeEmpty}</FieldDescription>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" role="group" aria-labelledby="santa-pair-label">
                      <Select value={pickA} onValueChange={(v) => (setPickA(v), v === pickB && setPickB(''))}>
                        <SelectTrigger className="h-11 w-full rounded-xl bg-card" aria-label={L.fExcludeFirst}>
                          <SelectValue placeholder={L.fExcludeFirst} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {options.map((o) => (
                              <SelectItem key={o.key} value={o.key}>
                                {o.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <Select value={pickB} onValueChange={setPickB} disabled={!pickA}>
                        <SelectTrigger className="h-11 w-full rounded-xl bg-card" aria-label={L.fExcludeSecond}>
                          <SelectValue placeholder={L.fExcludeSecond} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {options
                              .filter((o) => o.key !== pickA)
                              .map((o) => (
                                <SelectItem key={o.key} value={o.key}>
                                  {o.name}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={addPair} disabled={!pickA || !pickB}>
                        <LinkIcon data-icon="inline-start" />
                        {L.fExcludeAdd}
                      </Button>
                    </div>
                  )}
                  {pairs.length > 0 && (
                    <ItemGroup className="gap-2">
                      {pairs.map(([a, b]) => {
                        const live = keys.includes(a) && keys.includes(b);
                        return (
                          <Item key={`${a}|${b}`} variant="outline" size="xs" className={live ? 'bg-card' : 'opacity-50'}>
                            <ItemContent>
                              <ItemTitle>
                                {nameOf(a)} ⟷ {nameOf(b)}
                              </ItemTitle>
                            </ItemContent>
                            <ItemActions>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setPairs(pairs.filter((p) => p[0] !== a || p[1] !== b))}
                                aria-label={fmt(L.fExcludeRemove, { a: nameOf(a), b: nameOf(b) })}
                              >
                                <XIcon />
                              </Button>
                            </ItemActions>
                          </Item>
                        );
                      })}
                    </ItemGroup>
                  )}
                  {invalid('exclusions') && <FieldError>{issue?.text}</FieldError>}
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            {/* Cách vào phòng */}
            <FieldSet>
              <FieldLegend>{L.fMode}</FieldLegend>
              <RadioGroup value={joinMode} onValueChange={(v) => setJoinMode(v as JoinMode)} className="grid gap-3 sm:grid-cols-2">
                <FieldLabel htmlFor="santa-mode-open">
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>{L.fModeOpen}</FieldTitle>
                      <FieldDescription>{L.fModeOpenHint}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value="open" id="santa-mode-open" />
                  </Field>
                </FieldLabel>
                <FieldLabel htmlFor="santa-mode-invite">
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>{L.fModeInvite}</FieldTitle>
                      <FieldDescription>{L.fModeInviteHint}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value="invite" id="santa-mode-invite" />
                  </Field>
                </FieldLabel>
              </RadioGroup>
            </FieldSet>

            {issue?.field === 'rules' || feasible === false ? (
              <ErrorAlert>{L.errImpossible}</ErrorAlert>
            ) : (
              feasible && (
                <Alert>
                  <CheckCircle2Icon />
                  <AlertDescription>{L.fFeasible}</AlertDescription>
                </Alert>
              )
            )}
            <ErrorAlert>{formError}</ErrorAlert>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="flex-wrap gap-4 border-t pt-6">
        <Button type="submit" form="santa-create" variant="launch" size="pill" disabled={busy} aria-busy={busy || undefined}>
          {busy ? <Spinner data-icon="inline-start" aria-label={L.creating} /> : <RocketIcon data-icon="inline-start" />}
          {busy ? L.creating : L.createSubmit}
        </Button>
        <p className="min-w-56 flex-1 text-sm text-muted-foreground">{L.privacy}</p>
      </CardFooter>
    </Card>
  );
}
