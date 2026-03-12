import Image from "next/image";
import { InterviewScheduleForm } from "@/components/InterviewScheduleForm";

const METHOD_LABELS: Record<string, string> = {
  "in-person": "対面",
  online: "オンライン（Google Meet等）",
  flexible: "どちらでも可",
};

interface DecodedParams {
  cn: string;
  an: string;
  im: string;
}

function decodeParams(d: string): DecodedParams | null {
  try {
    const decoded = decodeURIComponent(escape(atob(d)));
    const parsed = JSON.parse(decoded);
    if (!parsed.cn || !parsed.an || !parsed.im) return null;
    if (!METHOD_LABELS[parsed.im]) return null;
    return parsed as DecodedParams;
  } catch {
    return null;
  }
}

export default async function InterviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { d } = await searchParams;

  if (!d || typeof d !== "string") {
    return <ErrorView />;
  }

  const params = decodeParams(d);
  if (!params) {
    return <ErrorView />;
  }

  const methodLabel = METHOD_LABELS[params.im];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <Image
            src="/BIZSTUDIO_LOGOMARK_02.png"
            alt="BizStudio"
            width={200}
            height={48}
            className="mx-auto mb-6 h-8 w-auto sm:h-10"
            priority
          />
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            面接日程のご希望
          </h1>
          <p className="mt-2 text-gray-600">
            ご都合の良い日時をお選びいただき面接希望日を提出してください。
          </p>
        </div>

        <InterviewScheduleForm
          candidateName={params.cn}
          advisorName={params.an}
          interviewMethod={methodLabel}
        />
      </div>
    </div>
  );
}

function ErrorView() {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <Image
            src="/BIZSTUDIO_LOGOMARK_02.png"
            alt="BizStudio"
            width={200}
            height={48}
            className="mx-auto mb-6 h-8 w-auto sm:h-10"
            priority
          />
        </div>
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mb-4 text-5xl">⚠️</div>
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            URLが無効です
          </h2>
          <p className="leading-relaxed text-gray-600">
            担当アドバイザーにお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
}
