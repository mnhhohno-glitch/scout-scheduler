import { Resend } from "resend";
import { sendLineWorksMessage } from "@/lib/lineworks";
import { createPortalTask } from "@/lib/portal-task";
import type { PortalTaskResponse } from "@/lib/portal-task";
import { sanitizeCid } from "@/lib/cid";
import {
  isSlotAllowed,
  jstNow,
  SLOT_RULE_ERROR_MESSAGE,
} from "@/lib/schedule-rules";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

interface DateTimeSlot {
  date: string;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
}

interface ScheduleBody {
  lastName: string;
  firstName: string;
  email: string;
  meetingFormat: string;
  slot1: DateTimeSlot;
  slot2: DateTimeSlot | null;
  slot3: DateTimeSlot | null;
  comment: string | null;
  source: string | null;
  candidateId?: string;
}

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

// portal の自動仮確定の待ち時間。超えたら現行どおり「希望日を受け付けました」に倒す
const PORTAL_TIMEOUT_MS = 12000;

interface ReservedInfo {
  label: string;
  method: string;
}

// 仮予約が成立したときだけ値を返す。それ以外（キー無し・not_reserved・失敗・タイムアウト）は null
function extractReserved(
  res: PortalTaskResponse | null,
  meetingFormat: string,
): ReservedInfo | null {
  const auto = res?.autoReserve;
  if (auto?.result !== "reserved") return null;
  const label = auto.slot?.label;
  if (!label) return null;
  return { label, method: auto.method || meetingFormat };
}

function autoReserveReason(res: PortalTaskResponse | null): string {
  if (!res) return "portal_unavailable";
  if (!res.autoReserve) return "no_result";
  return res.autoReserve.reason || res.autoReserve.result;
}

function fmtDate(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日（${DAY_NAMES[dt.getDay()]}）`;
}

function fmtTime(h: string, m: string): string {
  return `${h}:${m.padStart(2, "0")}`;
}

function fmtSlot(s: DateTimeSlot | null): string {
  if (!s) return "なし";
  return `${fmtDate(s.date)} ${fmtTime(s.startHour, s.startMinute)}〜${fmtTime(s.endHour, s.endMinute)}`;
}

function toMinutes(h: string, m: string) {
  return parseInt(h) * 60 + parseInt(m);
}

function validateBody(body: ScheduleBody): string | null {
  const { lastName, firstName, email, meetingFormat, slot1 } = body;
  // 判定の「現在」は送信を受け取った時刻（JST）
  const now = jstNow();

  if (!lastName?.trim() || !firstName?.trim() || !email?.trim() || !meetingFormat) {
    return "必須項目を入力してください";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "正しいメールアドレスを入力してください";
  }
  if (
    !slot1?.date ||
    !slot1?.startHour ||
    !slot1?.startMinute ||
    !slot1?.endHour ||
    !slot1?.endMinute
  ) {
    return "第1希望日時をすべて入力してください";
  }
  if (
    toMinutes(slot1.endHour, slot1.endMinute) <=
    toMinutes(slot1.startHour, slot1.startMinute)
  ) {
    return "終了時間は開始時間より後にしてください";
  }
  if (
    !isSlotAllowed(
      slot1.date,
      slot1.startHour,
      slot1.startMinute,
      slot1.endHour,
      slot1.endMinute,
      now,
    )
  ) {
    return SLOT_RULE_ERROR_MESSAGE;
  }

  for (const s of [body.slot2, body.slot3]) {
    if (s) {
      if (
        toMinutes(s.endHour, s.endMinute) <=
        toMinutes(s.startHour, s.startMinute)
      ) {
        return "終了時間は開始時間より後にしてください";
      }
      if (
        !isSlotAllowed(
          s.date,
          s.startHour,
          s.startMinute,
          s.endHour,
          s.endMinute,
          now,
        )
      ) {
        return SLOT_RULE_ERROR_MESSAGE;
      }
    }
  }

  return null;
}

function buildInternalHtml(b: ScheduleBody, autoReserveLine: string): string {
  return `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
  <p style="font-size:16px;">${b.lastName} ${b.firstName} 様より、面談の希望日時が届きました。</p>
  <div style="background:#f5f5f5;padding:20px;border-radius:8px;margin:20px 0;">
    <p style="margin:0 0 12px;"><strong>■ メールアドレス</strong><br>${b.email}</p>
    <p style="margin:0 0 12px;"><strong>■ 希望の面談形式</strong><br>${b.meetingFormat}</p>
    <p style="margin:0 0 12px;"><strong>■ 第1希望日時</strong><br>${fmtSlot(b.slot1)}</p>
    <p style="margin:0 0 12px;"><strong>■ 第2希望日時</strong><br>${fmtSlot(b.slot2)}</p>
    <p style="margin:0 0 12px;"><strong>■ 第3希望日時</strong><br>${fmtSlot(b.slot3)}</p>
    <p style="margin:0;"><strong>■ ご連絡事項</strong><br>${b.comment || "なし"}</p>
  </div>
  <p style="font-size:14px;">${autoReserveLine}</p>
</div>`;
}

// 求職者向けメール共通の末尾（迷惑メール注意＋署名）
const CANDIDATE_MAIL_FOOTER = `  <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
  <p style="color:#e74c3c;font-weight:bold;">⚠ 重要なお知らせ</p>
  <p style="color:#555;font-size:14px;">
    当社からのメールが「迷惑メール」フォルダに振り分けられる場合がございます。<br>
    <strong>@bizstudio.co.jp</strong> からのメールを受信できるよう、<br>
    迷惑メールフィルターの設定をご確認ください。<br><br>
    特に以下のメールサービスをご利用の方はご注意ください：<br>
    ・Gmail → 「迷惑メール」フォルダをご確認ください<br>
    ・Yahoo!メール → 「迷惑メール」フォルダをご確認ください<br>
    ・携帯キャリアメール → ドメイン指定受信に @bizstudio.co.jp を追加してください
  </p>
  <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
  <p style="font-size:13px;color:#888;">
    株式会社ビズスタジオ<br>
    〒102-0083 東京都千代田区麹町4-5-20 KSビル8階<br>
    https://www.bizstudio.co.jp<br><br>
    ※ このメールは自動送信です。本メールへの返信はできません。<br>
    ご不明点は agent@bizstudio.co.jp までご連絡ください。
  </p>`;

function buildCandidateHtml(b: ScheduleBody): string {
  return `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <p>${b.lastName} ${b.firstName} 様</p>
  <p>この度は面談の希望日をお送りいただき、誠にありがとうございます。<br>以下の内容で受け付けいたしました。</p>
  <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:20px 0;">
    <p style="margin:0 0 8px;"><strong>■ ご希望の面談形式</strong><br>${b.meetingFormat}</p>
    <p style="margin:0 0 8px;"><strong>■ 第1希望日時</strong><br>${fmtSlot(b.slot1)}</p>
    <p style="margin:0 0 8px;"><strong>■ 第2希望日時</strong><br>${fmtSlot(b.slot2)}</p>
    <p style="margin:0;"><strong>■ 第3希望日時</strong><br>${fmtSlot(b.slot3)}</p>
  </div>
  <p>担当者より <strong>1営業日以内</strong> に正式な日程をご連絡いたします。<br>今しばらくお待ちくださいませ。</p>
${CANDIDATE_MAIL_FOOTER}
</div>`;
}

// 仮予約が取れたときに求職者へ送るメール（デザイン・署名・迷惑メール注意は上と共通）
function buildReservedCandidateHtml(
  b: ScheduleBody,
  label: string,
  method: string,
): string {
  return `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <p>${b.lastName} ${b.firstName} 様</p>
  <p>お世話になっております。<br>株式会社ビズスタジオでございます。</p>
  <p>面談日程のご登録ありがとうございます。<br>以下の日時で面談のご予約を承りました。</p>
  <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:20px 0;">
    <p style="margin:0 0 8px;"><strong>■日時</strong>：${label}</p>
    <p style="margin:0;"><strong>■面談形式</strong>：${method}</p>
  </div>
  <p>担当者より改めて、面談方法（お電話の場合は発信元の番号、オンラインの場合はURL）をご連絡いたします。<br>やむを得ず日時の変更をご相談させていただく場合がございます。あらかじめご了承ください。</p>
  <p style="color:#555;font-size:14px;">※本メールは送信専用です。</p>
${CANDIDATE_MAIL_FOOTER}
</div>`;
}

function buildLineWorksMessage(b: ScheduleBody): string {
  const header = b.source
    ? `📅 面談希望日が届きました（${b.source}）`
    : "📅 面談希望日が届きました";
  return [
    header,
    "",
    "■ 氏名",
    `${b.lastName} ${b.firstName}`,
    "",
    "■ メールアドレス",
    b.email,
    "",
    "■ 面談形式",
    b.meetingFormat,
    "",
    "■ 第1希望日時",
    fmtSlot(b.slot1),
    "",
    "■ 第2希望日時",
    fmtSlot(b.slot2),
    "",
    "■ 第3希望日時",
    fmtSlot(b.slot3),
    "",
    "■ ご連絡事項",
    b.comment || "なし",
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const body: ScheduleBody = await request.json();

    const validationError = validateBody(body);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    // 先に portal のタスク作成（自動仮確定つき）を待ち、その結果でメールを出し分ける
    const candidateId = sanitizeCid(body.candidateId);
    const portalResponse = await createPortalTask(
      {
        type: "mynavi_new",
        candidateName: `${body.lastName} ${body.firstName}`,
        preferredDates: [
          `第1希望: ${fmtSlot(body.slot1)}`,
          `第2希望: ${fmtSlot(body.slot2)}`,
          `第3希望: ${fmtSlot(body.slot3)}`,
        ].join("\n"),
        meetingFormat: body.meetingFormat,
        email: body.email || undefined,
        notes: body.comment || undefined,
        source: body.source || undefined,
        ...(candidateId ? { candidateId } : {}),
        autoReserve: true,
      },
      { timeoutMs: PORTAL_TIMEOUT_MS },
    );

    const reserved = extractReserved(portalResponse, body.meetingFormat);
    const autoReserveLine = reserved
      ? `自動仮確定: ${reserved.label}`
      : `自動仮確定: なし（${autoReserveReason(portalResponse)}）`;

    const emailPromise = (async () => {
      try {
        const resend = getResend();
        await Promise.all([
          resend.emails.send({
            from: "BizStudio 日程調整 <no-reply@bizstudio.co.jp>",
            to: "agent@bizstudio.co.jp",
            subject: `${reserved ? "【自動仮確定】" : ""}【スカウト日程調整】${body.lastName} ${body.firstName} 様より希望日が届きました`,
            html: buildInternalHtml(body, autoReserveLine),
          }),
          resend.emails.send({
            from: "株式会社ビズスタジオ <no-reply@bizstudio.co.jp>",
            to: body.email,
            replyTo: "agent@bizstudio.co.jp",
            subject: reserved
              ? "【株式会社ビズスタジオ】面談日時のご案内"
              : "【株式会社ビズスタジオ】面談希望日を受け付けました",
            html: reserved
              ? buildReservedCandidateHtml(body, reserved.label, reserved.method)
              : buildCandidateHtml(body),
          }),
        ]);
      } catch (error) {
        console.error("Email send error:", error);
      }
    })();

    const lineWorksPromise = (async () => {
      try {
        await sendLineWorksMessage(buildLineWorksMessage(body));
      } catch (error) {
        console.error("LINE WORKS send error:", error);
      }
    })();

    await Promise.all([emailPromise, lineWorksPromise]);

    return Response.json({ success: true, reserved });
  } catch (error) {
    console.error("Schedule API error:", error);
    return Response.json(
      { error: "送信処理に失敗しました。しばらくしてからもう一度お試しください。" },
      { status: 500 },
    );
  }
}
