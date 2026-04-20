"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Compass, Home, ShieldCheck, Wrench } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  const highlights = [
    {
      icon: Wrench,
      title: t.notFound.rolloutTitle,
      description: t.notFound.rolloutDescription,
    },
    {
      icon: Compass,
      title: t.notFound.outdatedLinkTitle,
      description: t.notFound.outdatedLinkDescription,
    },
    {
      icon: ShieldCheck,
      title: t.notFound.nextStepTitle,
      description: t.notFound.nextStepDescription,
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(107,33,168,0.16),_transparent_32%),linear-gradient(180deg,_#ffffff_0%,_#faf7ff_45%,_#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(107,33,168,0.22),_transparent_26%),linear-gradient(180deg,_#09090b_0%,_#101014_48%,_#09090b_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-30">
        <div className="absolute left-[-8rem] top-16 h-56 w-56 rounded-full bg-[#6B21A8]/12 blur-3xl" />
        <div className="absolute bottom-0 right-[-5rem] h-72 w-72 rounded-full bg-[#7C3AED]/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(107,33,168,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(107,33,168,0.06)_1px,transparent_1px)] bg-[size:34px_34px] dark:bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-14 sm:px-8 lg:px-12">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_380px]">
          <section className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#6B21A8]/15 bg-white/75 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#6B21A8] shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-purple-200">
              <Compass className="h-3.5 w-3.5" />
              {t.notFound.badge}
            </div>

            <div className="space-y-5">
              <p className="text-[clamp(4.5rem,12vw,7.5rem)] font-semibold leading-none tracking-[-0.08em] text-[#171717] dark:text-white">
                404
              </p>
              <div className="space-y-3">
                <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] text-[#171717] dark:text-white sm:text-5xl">
                  {t.notFound.title}
                </h1>
                <p className="max-w-xl text-base leading-7 text-gray-600 dark:text-gray-300 sm:text-lg">
                  {t.notFound.description}
                </p>
              </div>

              {pathname ? (
                <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-black/6 bg-white/80 px-4 py-3 text-sm text-gray-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                  <span className="font-medium text-[#171717] dark:text-white">{t.notFound.requestedPath}</span>
                  <span className="truncate font-mono text-xs sm:text-sm">{pathname}</span>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Link
                  href="/"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "min-h-12 bg-[#6B21A8] px-6 text-white hover:bg-[#5b1b8f]"
                  )}
                >
                  <Home className="h-4 w-4" />
                  {t.notFound.primaryAction}
                </Link>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "min-h-12 px-6"
                  )}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t.notFound.secondaryAction}
                </button>
              </div>
            </div>
          </section>

          <aside className="rounded-[28px] border border-black/6 bg-white/80 p-6 shadow-[0_24px_80px_rgba(17,17,17,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-7">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(107,33,168,0.12)] text-[#6B21A8] dark:bg-[rgba(107,33,168,0.22)] dark:text-purple-200">
                <Wrench className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#171717] dark:text-white">
                  {t.notFound.statusTitle}
                </h2>
                <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {t.notFound.statusDescription}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {highlights.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-black/5 bg-[#fafafa] p-4 dark:border-white/8 dark:bg-black/20"
                >
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#171717] dark:text-white">
                    <Icon className="h-4 w-4 text-[#6B21A8] dark:text-purple-200" />
                    {title}
                  </div>
                  <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}