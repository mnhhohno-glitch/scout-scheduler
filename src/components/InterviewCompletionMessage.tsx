interface InterviewCompletionMessageProps {
  emailSent: boolean;
}

export function InterviewCompletionMessage({
  emailSent,
}: InterviewCompletionMessageProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
      <div className="mb-4 text-5xl">✅</div>
      <h2 className="mb-4 text-2xl font-bold text-gray-900">
        面接希望日を提出しました
      </h2>
      <p className="mb-8 leading-relaxed text-gray-600">
        担当アドバイザーが確認し、日程を調整いたします。
        <br />
        今しばらくお待ちください。
      </p>

      {emailSent && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-5 text-left">
          <p className="mb-2 font-bold text-yellow-800">
            ⚠ 確認メールをお送りしました
          </p>
          <p className="text-sm leading-relaxed text-yellow-700">
            届かない場合は迷惑メールフォルダをご確認ください。
            <br />
            <strong>@bizstudio.co.jp</strong>{" "}
            からのメールを受信できるよう設定をご確認ください。
          </p>
        </div>
      )}
    </div>
  );
}
