/**
 * Màn đầu: tab "Vào phòng" (mã 6 ký tự + phòng gần đây) và tab "Tạo phòng mới".
 * Form tạo phòng (Select, RadioGroup, Switch, thuật toán chia cặp) tải sau, chỉ khi mở tab đó:
 * đa số người vào trang chỉ để nhập mã.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowUpRightIcon, LogInIcon, PlusIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCode, ROOM_CODE_LENGTH } from '@/lib/play/santa';
import { fmt } from '@/lib/utils';
import { store, type Labels, type Recent } from './api';
import { CodeInput } from './parts';
import type { Created } from './CreateForm';
import { Skeleton } from '@/components/ui/skeleton';

const CreateForm = lazy(() => import('./CreateForm').then((m) => ({ default: m.CreateForm })));

export function Home({ labels: L, onOpen, onCreated }: { labels: Labels; onOpen: (code: string) => void; onCreated: (room: Created) => void }) {
  const [tab, setTab] = useState('join');
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [recent, setRecent] = useState<Recent[]>([]);

  useEffect(() => setRecent(store.recent()), []);

  const join = (value = code) => {
    if (value.length !== ROOM_CODE_LENGTH) return setError(true);
    onOpen(value);
  };

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-6">
      <TabsList className="h-11 w-full max-w-md self-center">
        <TabsTrigger value="join">
          <LogInIcon data-icon="inline-start" />
          {L.tabJoin}
        </TabsTrigger>
        <TabsTrigger value="create">
          <PlusIcon data-icon="inline-start" />
          {L.tabCreate}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="join" className="flex flex-col gap-6">
        <Card className="mx-auto w-full max-w-xl">
          <CardHeader>
            <p className="mono muted">ROOM · {L.joinLabel}</p>
            <CardTitle className="font-heading text-2xl font-bold">{L.tabJoin}</CardTitle>
            <CardDescription>{L.joinText}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-6"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                join();
              }}
            >
              <Field data-invalid={error || undefined}>
                <FieldLabel htmlFor="santa-join" className="sr-only">
                  {L.joinLabel}
                </FieldLabel>
                <CodeInput
                  id="santa-join"
                  length={ROOM_CODE_LENGTH}
                  value={code}
                  invalid={error}
                  describedBy={error ? 'santa-join-hint' : undefined}
                  onChange={(v) => {
                    setCode(v);
                    setError(false);
                  }}
                  onComplete={join}
                />
                {error && <FieldError id="santa-join-hint">{L.errCode}</FieldError>}
              </Field>
              <Button type="submit" variant="launch" size="pill" className="self-start">
                {L.joinSubmit}
                <ArrowUpRightIcon data-icon="inline-end" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {recent.length > 0 && (
          <section className="mx-auto flex w-full max-w-xl flex-col gap-3" aria-labelledby="santa-recent">
            <h2 id="santa-recent" className="mono muted">
              {L.recentTitle}
            </h2>
            <ItemGroup className="gap-2">
              {recent.map((r) => (
                <Item key={r.code} variant="outline" className="bg-card">
                  <ItemContent>
                    <ItemTitle className="font-semibold">{r.title}</ItemTitle>
                    <ItemDescription className="font-mono tracking-wider">{formatCode(r.code)}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Badge variant={r.role === 'admin' ? 'active' : 'queued'}>{r.role === 'admin' ? L.recentAdmin : L.recentMember}</Badge>
                    <Button variant="outline" size="icon-sm" onClick={() => onOpen(r.code)} aria-label={fmt(L.recentOpen, { title: r.title })}>
                      <ArrowUpRightIcon />
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </section>
        )}
      </TabsContent>

      <TabsContent value="create">
        <Suspense fallback={<Skeleton className="mx-auto h-[56rem] w-full max-w-3xl rounded-2xl" />}>
          <CreateForm labels={L} onCreated={onCreated} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
