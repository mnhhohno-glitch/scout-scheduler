import { Resend } from "resend";
import { sendLineWorksMessageWithMention } from "@/lib/lineworks";
import { getStaffByName } from "@/lib/portal-api";

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

interface ConsultationScheduleBody {
  candidateName: string;
  advisorName: string;
  consultationMethod: string;
  email: string | null;
  slot1: DateTimeSlot;
  slot2: DateTimeSlot | null;
  slot3: DateTimeSlot | null;
  comment: string | null;
}

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

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

function validateBody(body: ConsultationScheduleBody): string | null {
  const { candidateName, advisorName, consultationMethod, email, slot1 } = body;

  if (!candidateName?.trim() || !advisorName?.trim() || !consultationMethod?.trim()) {
    return "必須項目が不足しています";
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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

  for (const s of [body.slot2, body.slot3]) {
    if (s) {
      if (
        toMinutes(s.endHour, s.endMinute) <=
        toMinutes(s.startHour, s.startMinute)
      ) {
        return "終了時間は開始時間より後にしてください";
      }
    }
  }

  return null;
}

function buildLineWorksMessage(b: ConsultationScheduleBody): string {
  return [
    "📅 面談希望日が届きました",
    "",
    "■ 担当アドバイザー",
    b.advisorName,
    "",
    "■ 求職者",
    `${b.candidateName} 様`,
    "",
    "■ 面談形式",
    b.consultationMethod,
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

function buildCandidateHtml(b: ConsultationScheduleBody): string {
  return `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <p>${b.candidateName} 様</p>
  <p>この度は面談の希望日をお送りいただき、誠にありがとうございます。<br>以下の内容で受け付けいたしました。</p>
  <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:20px 0;">
    <p style="margin:0 0 8px;"><strong>■ 面談形式</strong><br>${b.consultationMethod}</p>
    <p style="margin:0 0 8px;"><strong>■ 第1希望日時</strong><br>${fmtSlot(b.slot1)}</p>
    <p style="margin:0 0 8px;"><strong>■ 第2希望日時</strong><br>${fmtSlot(b.slot2)}</p>
    <p style="margin:0;"><strong>■ 第3希望日時</strong><br>${fmtSlot(b.slot3)}</p>
  </div>
  <p>担当アドバイザーより日程を調整のうえご連絡いたします。<br>今しばらくお待ちくださいませ。</p>
  <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
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
  </p>
</div>`;
}

export async function POST(request: Request) {
  try {
    const body: ConsultationScheduleBody = await request.json();

    const validationError = validateBody(body);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const lineWorksPromise = (async () => {
      try {
        const staff = await getStaffByName(body.advisorName);
        await sendLineWorksMessageWithMention(
          buildLineWorksMessage(body),
          staff?.lineworksId || null,
        );
      } catch (error) {
        console.error("LINE WORKS send error:", error);
      }
    })();

    const emailPromise = (async () => {
      if (!body.email) return;
      try {
        const resend = getResend();
        await resend.emails.send({
          from: "株式会社ビズスタジオ <no-reply@bizstudio.co.jp>",
          to: body.email,
          replyTo: "agent@bizstudio.co.jp",
          subject: "【株式会社ビズスタジオ】面談希望日を受け付けました",
          html: buildCandidateHtml(body),
        });
      } catch (error) {
        console.error("Email send error:", error);
      }
    })();

    await Promise.all([lineWorksPromise, emailPromise]);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Consultation schedule API error:", error);
    return Response.json(
      { error: "送信処理に失敗しました。しばらくしてからもう一度お試しください。" },
      { status: 500 },
    );
  }
}
