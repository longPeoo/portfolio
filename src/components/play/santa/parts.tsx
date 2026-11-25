/** Mảnh giao diện dùng chung trong trò Secret Santa: ô sao chép link, nút sao chép, báo lỗi. */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircleIcon, CheckIcon, CopyIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { normalizeCode } from '@/lib/play/santa';
import type { Labels } from './api';

/**
 * Linh vật Orbi là component Astro (SVG tĩnh): trang truyền vào island qua slot "orbi", các màn con lấy ra bằng useOrbi().
 * Cỡ chỉnh bằng CSS (.santa-orbi), không cần bản React riêng.
 */
export const OrbiContext = createContext<ReactNode>(null);

export function OrbiMark({ size = 72, className }: { size?: number; className?: string }) {
  const orbi = useContext(OrbiContext);
  if (!orbi) return null;
  return (
    <span className={['santa-orbi', className].filter(Boolean).join(' ')} style={{ width: size }} aria-hidden="true">
      {orbi}
    </span>
  );
}

/** Chép vào bộ nhớ tạm; trình duyệt chặn thì chọn sẵn chữ để người xem tự Ctrl+C */
export function useCopy() {
  const [copied, setCopied] = useState<string | undefined>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async (text: string, key = text, fallback?: HTMLInputElement | null) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(undefined), 1800);
    } catch {
      fallback?.select();
    }
  };
  return { copied, copy };
}

export function CopyField({ id, label, value, labels, description, mono }: {
  id: string;
  label: string;
  value: string;
  labels: Labels;
  description?: ReactNode;
  mono?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { copied, copy } = useCopy();
  const done = copied === value;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup className="h-11 rounded-xl bg-card">
        <InputGroupInput
          ref={input}
          id={id}
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className={mono ? 'font-mono tracking-wider' : undefined}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="sm" variant="secondary" onClick={() => copy(value, value, input.current)} aria-live="polite">
            {done ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
            {done ? labels.copied : labels.copy}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}

export function CopyButton({ value, label, labels, iconOnly }: { value: string; label: string; labels: Labels; iconOnly?: boolean }) {
  const { copied, copy } = useCopy();
  const done = copied === value;
  if (iconOnly)
    return (
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => copy(value)} aria-label={done ? labels.copied : label} title={label}>
        {done ? <CheckIcon /> : <CopyIcon />}
      </Button>
    );
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => copy(value)}>
      {done ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
      {done ? labels.copied : label}
    </Button>
  );
}

/**
 * Ô nhập mã (InputOTP): 6 ký tự (mã phòng) hoặc 8 ký tự (mã cá nhân / mã xem lại), tách đôi bằng gạch.
 * Dán cả link cũng được: tự lấy ?code= (mã phòng) hoặc #join= (mã cá nhân).
 */
export function CodeInput({ id, length, value, onChange, onComplete, invalid, describedBy }: {
  id: string;
  length: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const half = Math.ceil(length / 2);
  const fromPaste = (text: string) => {
    try {
      const url = new URL(text.trim());
      const pick = length === 6 ? url.searchParams.get('code') : new URLSearchParams(url.hash.slice(1)).get('join');
      if (pick) return normalizeCode(pick).slice(0, length);
    } catch {
      // Không phải link: dán mã thường
    }
    return normalizeCode(text).slice(0, length);
  };
  return (
    <InputOTP
      id={id}
      maxLength={length}
      value={value}
      onChange={(v) => onChange(normalizeCode(v))}
      onComplete={onComplete}
      pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
      pasteTransformer={fromPaste}
      inputMode="text"
      autoCapitalize="characters"
      autoComplete="one-time-code"
      spellCheck={false}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      containerClassName="santa-otp flex-wrap gap-2"
    >
      <InputOTPGroup>
        {Array.from({ length: half }, (_, i) => <InputOTPSlot key={i} index={i} aria-invalid={invalid || undefined} />)}
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        {Array.from({ length: length - half }, (_, i) => <InputOTPSlot key={i} index={half + i} aria-invalid={invalid || undefined} />)}
      </InputOTPGroup>
    </InputOTP>
  );
}

export function ErrorAlert({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircleIcon />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
