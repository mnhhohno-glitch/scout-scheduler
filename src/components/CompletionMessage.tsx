export function CompletionMessage() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
      <div className="mb-4 text-5xl">✅</div>
      <h2 className="mb-4 text-2xl font-bold text-gray-900">
        ご希望日時を受け付けました
      </h2>
      <p className="mb-8 leading-relaxed text-gray-600">
        ご入力いただいたメールアドレス宛に確認メールをお送りしました。
        <br />
        担当者より1営業日以内に正式な日程をご連絡いたします。
      </p>

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
