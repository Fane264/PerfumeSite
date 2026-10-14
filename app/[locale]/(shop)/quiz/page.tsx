"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetchEnvelope, buildPerfumeQuery } from "@/lib/api-client";
import { PerfumeCard } from "@/components/shop/perfume-card";
import type { ApiPerfumeListItem } from "@/types";

interface Option {
  label: string;
  family?: string;
}

interface Question {
  key: string;
  title: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    key: "mood",
    title: "Ce dispoziție cauți?",
    options: [
      { label: "Proaspăt", family: "fresh" },
      { label: "Cald", family: "oriental" },
      { label: "Misterios", family: "woody" },
      { label: "Vivace", family: "floral" },
    ],
  },
  {
    key: "season",
    title: "Ce anotimp îți descrie personalitatea?",
    options: [
      { label: "Primăvară", family: "floral" },
      { label: "Vară", family: "fresh" },
      { label: "Toamnă", family: "chypre" },
      { label: "Iarnă", family: "oriental" },
    ],
  },
  {
    key: "occasion",
    title: "Unde vei purta cel mai des parfumul?",
    options: [
      { label: "Zi de lucru" },
      { label: "Seară", family: "oriental" },
      { label: "Weekend", family: "fresh" },
      { label: "Ocazie specială", family: "woody" },
    ],
  },
  {
    key: "intensity",
    title: "Ce intensitate preferi?",
    options: [
      { label: "Discret", family: "fresh" },
      { label: "Moderat", family: "floral" },
      { label: "Puternic", family: "woody" },
      { label: "Copleșitor", family: "oriental" },
    ],
  },
  {
    key: "note",
    title: "Care din aceste note îți atrag atenția?",
    options: [
      { label: "Trandafir", family: "floral" },
      { label: "Lemn de santal", family: "woody" },
      { label: "Bergamotă", family: "fresh" },
      { label: "Oud", family: "oriental" },
      { label: "Vanilie", family: "gourmand" },
      { label: "Iasomie", family: "floral" },
    ],
  },
];

type Phase = "quiz" | "loading" | "results";

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(Option | null)[]>(
    Array(QUESTIONS.length).fill(null),
  );
  const [phase, setPhase] = useState<Phase>("quiz");
  const [results, setResults] = useState<ApiPerfumeListItem[]>([]);

  const question = QUESTIONS[step]!;
  const progress = ((step + (phase === "results" ? 1 : 0)) / QUESTIONS.length) * 100;

  function pickFamily(all: (Option | null)[]): string {
    // Last answer (notes) is the strongest signal; fall back through the rest.
    for (const a of [all[4], all[0], all[3], all[1], all[2]]) {
      if (a?.family) return a.family;
    }
    return "woody";
  }

  async function finish(all: (Option | null)[]) {
    setPhase("loading");
    const family = pickFamily(all);
    try {
      const tryFetch = async (
        params: Record<string, string | number | boolean>,
      ) => {
        const env = await apiFetchEnvelope<ApiPerfumeListItem[]>(
          `/api/perfumes${buildPerfumeQuery(params)}`,
        );
        return env.data ?? [];
      };
      let items = await tryFetch({ family, sort: "popular", limit: 3 });
      if (items.length < 3) {
        items = await tryFetch({ featured: true, sort: "popular", limit: 3 });
      }
      if (items.length === 0) {
        items = await tryFetch({ sort: "popular", limit: 3 });
      }
      setResults(items.slice(0, 3));
    } catch {
      setResults([]);
    }
    setPhase("results");
  }

  function choose(option: Option) {
    const next = [...answers];
    next[step] = option;
    setAnswers(next);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      void finish(next);
    }
  }

  function reset() {
    setStep(0);
    setAnswers(Array(QUESTIONS.length).fill(null));
    setResults([]);
    setPhase("quiz");
  }

  return (
    <div className="container flex min-h-[80vh] flex-col py-28 md:py-32">
      {/* Progress */}
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
          <span className="flex items-center gap-2 text-gold">
            <Sparkles className="size-4" /> Quiz olfactiv
          </span>
          {phase === "quiz" && (
            <span>
              {step + 1} / {QUESTIONS.length}
            </span>
          )}
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface2">
          <div
            className="h-full bg-gold transition-all duration-500"
            style={{ width: `${phase === "results" ? 100 : progress}%` }}
          />
        </div>
      </div>

      <div className="mx-auto mt-16 flex w-full max-w-3xl flex-1 flex-col">
        <AnimatePresence mode="wait">
          {phase === "quiz" && (
            <motion.div
              key={`q-${step}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35 }}
            >
              <h1 className="text-center font-serif text-3xl font-light text-cream md:text-5xl">
                {question.title}
              </h1>
              <div
                className={cn(
                  "mt-12 grid gap-4",
                  question.options.length > 4
                    ? "sm:grid-cols-3"
                    : "sm:grid-cols-2",
                )}
              >
                {question.options.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => choose(option)}
                    className="border border-border bg-surface px-6 py-8 text-center font-serif text-xl font-light text-cream transition-all hover:border-gold hover:bg-gold/5 hover:text-gold"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="mx-auto mt-10 flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:text-gold"
                >
                  <ArrowLeft className="size-4" /> Înapoi
                </button>
              )}
            </motion.div>
          )}

          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-4 py-20 text-center"
            >
              <Loader2 className="size-8 animate-spin text-gold" />
              <p className="font-serif text-2xl font-light text-cream">
                Îți compunem profilul olfactiv…
              </p>
            </motion.div>
          )}

          {phase === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-center">
                <p className="text-xs uppercase tracking-luxe text-gold">
                  Parfumul tău
                </p>
                <h1 className="mt-3 font-serif text-4xl font-light text-cream md:text-5xl">
                  Recomandările noastre pentru tine
                </h1>
              </div>

              {results.length > 0 ? (
                <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-3">
                  {results.map((perfume) => (
                    <PerfumeCard key={perfume.id} perfume={perfume} />
                  ))}
                </div>
              ) : (
                <p className="mt-12 text-center text-muted-foreground">
                  Nu am găsit recomandări momentan.{" "}
                  <Link href="/parfumuri" className="text-gold hover:underline">
                    Explorează colecția
                  </Link>
                </p>
              )}

              <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={reset}
                  className="flex items-center gap-2 border border-border px-6 py-3 text-sm uppercase tracking-widest text-cream transition-colors hover:border-gold hover:text-gold"
                >
                  <RotateCcw className="size-4" /> Refă quizul
                </button>
                <Link
                  href="/parfumuri"
                  className="flex items-center gap-2 bg-gold px-6 py-3 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light"
                >
                  Vezi toate parfumurile <ArrowRight className="size-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
