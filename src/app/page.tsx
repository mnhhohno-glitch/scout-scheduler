import Image from "next/image";
import { ScheduleForm } from "@/components/ScheduleForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <Image
            src="https://www.bizstudio.co.jp/_astro/logo.DhCSnz3e_Z1RU3J.webp"
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
            ご都合の良い日時をお選びください。
          </p>
        </div>

        <ScheduleForm />
      </div>
    </div>
  );
}
