import Image from "next/image";
import { ScheduleForm } from "@/components/ScheduleForm";
import { sanitizeCid } from "@/lib/cid";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { cid } = await searchParams;
  const candidateId = sanitizeCid(typeof cid === "string" ? cid : undefined);

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
            マイナビ転職よりご応募ありがとうございました。
            <br />
            ご都合の良い日時をお選びいただき面談希望日を提出してください。
          </p>
        </div>

        <ScheduleForm source="マイナビ転職" candidateId={candidateId} />
      </div>
    </div>
  );
}
