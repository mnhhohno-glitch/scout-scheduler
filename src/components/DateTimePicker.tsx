"use client";

import { useMemo } from "react";

export interface DateTimeSlot {
  date: string;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
}

interface DateTimePickerProps {
  label: string;
  required?: boolean;
  value: DateTimeSlot;
  onChange: (value: DateTimeSlot) => void;
  error?: string;
}

const HOURS = [
  "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21",
];
const MINUTES = ["00", "15", "30", "45"];
const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

function generateDateOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const value = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const label = `${m}月${day}日（${DAY_NAMES[d.getDay()]}）`;
    options.push({ value, label });
  }
  return options;
}

const SEL =
  "rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none";

export function DateTimePicker({
  label,
  required,
  value,
  onChange,
  error,
}: DateTimePickerProps) {
  const dateOptions = useMemo(() => generateDateOptions(), []);

  const set = (field: keyof DateTimeSlot, v: string) =>
    onChange({ ...value, [field]: v });

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="ml-2 inline-block rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">
            必須
          </span>
        )}
      </label>

      {/* 日付 */}
      <div className="mb-3">
        <select
          value={value.date}
          onChange={(e) => set("date", e.target.value)}
          className={`w-full ${SEL}`}
        >
          <option value="">日付を選択</option>
          {dateOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* 時間 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1.5">
          <span className="w-8 text-xs text-gray-500">開始</span>
          <select
            value={value.startHour}
            onChange={(e) => set("startHour", e.target.value)}
            className={`w-20 ${SEL}`}
          >
            <option value="">時</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <span className="text-gray-400">:</span>
          <select
            value={value.startMinute}
            onChange={(e) => set("startMinute", e.target.value)}
            className={`w-20 ${SEL}`}
          >
            <option value="">分</option>
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <span className="hidden text-gray-400 sm:block">〜</span>
        <span className="pl-8 text-sm text-gray-400 sm:hidden">〜</span>

        <div className="flex items-center gap-1.5">
          <span className="w-8 text-xs text-gray-500">終了</span>
          <select
            value={value.endHour}
            onChange={(e) => set("endHour", e.target.value)}
            className={`w-20 ${SEL}`}
          >
            <option value="">時</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <span className="text-gray-400">:</span>
          <select
            value={value.endMinute}
            onChange={(e) => set("endMinute", e.target.value)}
            className={`w-20 ${SEL}`}
          >
            <option value="">分</option>
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
