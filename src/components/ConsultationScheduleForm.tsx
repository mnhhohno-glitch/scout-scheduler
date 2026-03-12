"use client";

import { useState } from "react";
import { DateTimePicker, type DateTimeSlot } from "./DateTimePicker";
import { ConsultationCompletionMessage } from "./ConsultationCompletionMessage";

interface ConsultationScheduleFormProps {
  candidateName: string;
  advisorName: string;
  consultationMethod: string;
}

const EMPTY_SLOT: DateTimeSlot = {
  date: "",
  startHour: "",
  startMinute: "",
  endHour: "",
  endMinute: "",
};

function isSlotFilled(s: DateTimeSlot) {
  return !!(s.date && s.startHour && s.startMinute && s.endHour && s.endMinute);
}

function isSlotPartial(s: DateTimeSlot) {
  const vals = [s.date, s.startHour, s.startMinute, s.endHour, s.endMinute];
  const filled = vals.filter(Boolean).length;
  return filled > 0 && filled < 5;
}

function toMinutes(h: string, m: string) {
  return parseInt(h) * 60 + parseInt(m);
}

function slotsIdentical(a: DateTimeSlot, b: DateTimeSlot) {
  return (
    a.date === b.date &&
    a.startHour === b.startHour &&
    a.startMinute === b.startMinute &&
    a.endHour === b.endHour &&
    a.endMinute === b.endMinute
  );
}

const INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none";

export function ConsultationScheduleForm({
  candidateName,
  advisorName,
  consultationMethod,
}: ConsultationScheduleFormProps) {
  const [email, setEmail] = useState("");
  const [slot1, setSlot1] = useState<DateTimeSlot>({ ...EMPTY_SLOT });
  const [slot2, setSlot2] = useState<DateTimeSlot>({ ...EMPTY_SLOT });
  const [slot3, setSlot3] = useState<DateTimeSlot>({ ...EMPTY_SLOT });
  const [comment, setComment] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = "正しいメールアドレスを入力してください";
    }

    if (!isSlotFilled(slot1)) {
      e.slot1 = "第1希望日時をすべて入力してください";
    } else if (
      toMinutes(slot1.endHour, slot1.endMinute) <=
      toMinutes(slot1.startHour, slot1.startMinute)
    ) {
      e.slot1 = "終了時間は開始時間より後にしてください";
    }

    for (const [key, slot] of [
      ["slot2", slot2],
      ["slot3", slot3],
    ] as const) {
      if (isSlotPartial(slot)) {
        e[key] = "すべての項目を入力するか、空にしてください";
      } else if (isSlotFilled(slot)) {
        if (
          toMinutes(slot.endHour, slot.endMinute) <=
          toMinutes(slot.startHour, slot.startMinute)
        ) {
          e[key] = "終了時間は開始時間より後にしてください";
        }
      }
    }

    const filled: { key: string; slot: DateTimeSlot }[] = [];
    if (isSlotFilled(slot1)) filled.push({ key: "slot1", slot: slot1 });
    if (isSlotFilled(slot2)) filled.push({ key: "slot2", slot: slot2 });
    if (isSlotFilled(slot3)) filled.push({ key: "slot3", slot: slot3 });
    for (let i = 0; i < filled.length; i++) {
      for (let j = i + 1; j < filled.length; j++) {
        if (slotsIdentical(filled[i].slot, filled[j].slot)) {
          e[filled[j].key] = "他の希望日時と重複しています";
        }
      }
    }

    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await fetch("/api/consultation-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName,
          advisorName,
          consultationMethod,
          email: email.trim() || null,
          slot1,
          slot2: isSlotFilled(slot2) ? slot2 : null,
          slot3: isSlotFilled(slot3) ? slot3 : null,
          comment: comment.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "送信に失敗しました");
      }

      setEmailSent(!!email.trim());
      setIsCompleted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErrors({
        submit:
          err instanceof Error
            ? err.message
            : "送信に失敗しました。もう一度お試しください。",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCompleted)
    return <ConsultationCompletionMessage emailSent={emailSent} />;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* ── 基本情報 ── */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="mb-6 text-lg font-bold text-gray-900">基本情報</h2>

        <div className="mb-4">
          <p className="mb-1 text-sm font-medium text-gray-700">お名前</p>
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
            {candidateName} 様
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            メールアドレス
            <span className="ml-2 inline-block rounded bg-gray-400 px-1.5 py-0.5 text-xs text-white">
              任意
            </span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className={INPUT}
          />
          <p className="mt-1 text-xs text-gray-500">
            ご自身の提出した日程をメールで受け取りたい場合はアドレスを入力してください
          </p>
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>
      </div>

      {/* ── 面談・希望日 ── */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="mb-6 text-lg font-bold text-gray-900">面談・希望日</h2>

        {/* 注意書き */}
        <div className="mb-6 flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="mb-1 text-sm font-bold text-yellow-800">【ご注意】</p>
            <p className="text-sm leading-relaxed text-yellow-700">
              こちらは面談の「希望日」です。確定ではございません。
              <br />
              日程が合わない場合もございますので、確定は担当アドバイザーからのご連絡をもってご案内いたします。
            </p>
          </div>
        </div>

        {/* 面談形式 */}
        <div className="mb-8">
          <p className="mb-1 text-sm font-medium text-gray-700">面談形式</p>
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
            {consultationMethod}
          </p>
        </div>

        {/* 希望日時 */}
        <div className="space-y-6">
          <DateTimePicker
            label="第1希望日時"
            required
            value={slot1}
            onChange={setSlot1}
            error={errors.slot1}
          />
          <DateTimePicker
            label="第2希望日時"
            value={slot2}
            onChange={setSlot2}
            error={errors.slot2}
          />
          <DateTimePicker
            label="第3希望日時"
            value={slot3}
            onChange={setSlot3}
            error={errors.slot3}
          />
        </div>
      </div>

      {/* ── ご連絡事項・同意・送信 ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            ご連絡事項
            <span className="ml-2 inline-block rounded bg-gray-400 px-1.5 py-0.5 text-xs text-white">
              任意
            </span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="ご質問やご要望がございましたらご記入ください"
            rows={4}
            className={INPUT}
          />
        </div>

        <label className="mb-6 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={privacyAgreed}
            onChange={(e) => setPrivacyAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-blue-600"
          />
          <span className="text-sm text-gray-700">
            <a
              href="https://www.bizstudio.co.jp/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              プライバシーポリシー
            </a>
            に同意する
          </span>
        </label>

        {errors.submit && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errors.submit}
          </div>
        )}

        <button
          type="submit"
          disabled={!privacyAgreed || isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isSubmitting ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              送信中...
            </>
          ) : (
            "面談希望日を提出する"
          )}
        </button>
      </div>
    </form>
  );
}
