export interface ReservedInfo {
  label: string;
  method?: string;
}

export function CompletionMessage({ reserved }: { reserved?: ReservedInfo | null }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
      <div className="mb-4 text-5xl">✅</div>
      {reserved ? (
        <>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            面談のご予約を承りました
          </h2>
          <p className="mb-8 leading-relaxed text-gray-600">
            日時：{reserved.label}
            {reserved.method ? `／面談形式：${reserved.method}` : ""}
            <br />
            ご入力いただいたメールアドレス宛にご案内メールをお送りしました。
            <br />
            担当者より改めて面談方法をご連絡いたします。
          </p>
        </>
      ) : (
        <>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            ご希望日時を受け付けました
          </h2>
          <p className="mb-8 leading-relaxed text-gray-600">
            ご入力いただいたメールアドレス宛に確認メールをお送りしました。
            <br />
            担当者より1営業日以内に正式な日程をご連絡いたします。
          </p>
        </>
      )}

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-5 text-left">
        <p className="mb-2 font-bold text-yellow-800">⚠ メールが届かない場合</p>
        <p className="text-sm leading-relaxed text-yellow-700">
          迷惑メールフォルダに振り分けられている可能性があります。
          <br />
          <strong>@bizstudio.co.jp</strong>{" "}
          からのメールを受信できるよう設定をご確認ください。
        </p>
      </div>
    </div>
  );
}
