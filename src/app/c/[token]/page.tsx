import Image from "next/image";
import { ConsultationScheduleForm } from "@/components/ConsultationScheduleForm";

interface ScheduleLinkData {
  candidateName: string;
  advisorName: string;
}

async function fetchScheduleLink(
  token: string,
): Promise<ScheduleLinkData | null> {
  const baseUrl = process.env.PORTAL_API_URL;
  if (!baseUrl) {
    console.error("PORTAL_API_URL is not configured");
    return null;
  }

  try {
    const res = await fetch(`${baseUrl}/api/schedule-links/${token}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch schedule link:", error);
    return null;
  }
}

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await fetchScheduleLink(token);

  if (!data) {
    return <ErrorView />;
  }

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
            面談日程のご希望
          </h1>
          <p className="mt-2 text-gray-600">
            ご都合の良い日時をお選びいただき面談希望日を提出してください。
          </p>
        </div>

        <ConsultationScheduleForm
          candidateName={data.candidateName}
          advisorName={data.advisorName}
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
