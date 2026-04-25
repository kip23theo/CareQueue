"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Stat = {
  label: string;
  value: string;
};

const stats: Stat[] = [
  { label: "Queue updates", value: "< 30 sec" },
  { label: "Clinics online", value: "450+" },
  { label: "Patients served/day", value: "12K+" },
];

export default function PatientHome() {
  const router = useRouter();

  return (
    <div className="relative min-h-[calc(100vh-70px)] px-4 py-8 sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_50%_5%,rgba(34,211,238,0.09),transparent_55%)]"
      />

      <div className="mx-auto flex max-w-4xl items-center justify-center pt-8 sm:pt-12">
        <Card className="w-full border-white/80 bg-white/68 p-7 text-center sm:p-10">
          <h1 className="text-4xl font-bold leading-tight text-surface-900 sm:text-5xl">
            Skip the crowd.
            <span className="block text-brand-700">
              Keep your day on track.
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-surface-600 sm:text-lg">
            CareQueue helps you pick the right clinic, join digitally, and
            arrive only when your turn is near.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => router.push("/patient/clinics")}
              className="h-11 rounded-xl px-5 text-sm"
            >
              Explore clinics
              <ArrowRight size={16} />
            </Button>

            <Button
              onClick={() => router.push("/patient/doctors")}
              variant="outline"
              className="h-11 rounded-xl border-surface-300 bg-white/78 px-5 text-sm"
            >
              Find doctors
            </Button>
          </div>

          <div className="mt-7 grid gap-3 text-left sm:grid-cols-3">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-surface-200 bg-white/75 px-4 py-3"
              >
                <p className="text-[11px] uppercase tracking-[0.08em] text-surface-500">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-surface-900">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
