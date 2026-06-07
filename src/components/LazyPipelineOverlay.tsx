"use client";

import { Check, Loader2 } from "lucide-react";

export type PipelineStep = {
  title: string;
  label: string;
  status: string;
  result?: string;
};

export function LazyPipelineOverlay({
  visible,
  title,
  steps,
  activeStep,
}: {
  visible: boolean;
  title: string;
  steps: PipelineStep[];
  activeStep: number;
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <div className="pipeline-enter w-full max-w-xl rounded-lg border border-neutral-200 bg-[#fbfaf7] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Maven intelligence</p>
            <h2 className="mt-2 text-xl font-semibold text-neutral-950">{title}</h2>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" aria-hidden="true" />
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => {
            const complete = index < activeStep;
            const active = index === activeStep;

            return (
              <div
                key={step.title}
                className="flex gap-3 rounded-md border border-neutral-200 bg-white px-4 py-3"
              >
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    complete
                      ? "bg-emerald-600 text-white"
                      : active
                        ? "bg-amber-100 text-amber-700"
                        : "bg-neutral-100 text-neutral-400"
                  }`}
                >
                  {complete ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-current" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="font-medium text-neutral-950">{step.title}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">{step.label}</p>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">{complete && step.result ? step.result : step.status}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
