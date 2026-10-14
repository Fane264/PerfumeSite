import { unstable_cache } from "next/cache";
import { Gender } from "@prisma/client";
import { db } from "./db";

// ----------------------------------------------------------------------------
//  Scent DNA Profile (Phase 9).
//
//  A user's personal olfactory fingerprint, derived from their behaviour:
//  purchases weigh 3×, wishlist items 2×. (There is no persisted quiz result
//  model, so the quiz contributes via the items a user later buys/wishlists.)
//  The result is mapped to one of eight archetypes and cached for an hour.
// ----------------------------------------------------------------------------

const WEIGHT_PURCHASE = 3;
const WEIGHT_WISHLIST = 2;

export interface ScentFamilyScore {
  /** Family slug, e.g. "oriental". */
  slug: string;
  name: string;
  colorHex: string;
  score: number;
  percentage: number;
}

export interface ScentNoteCount {
  slug: string;
  name: string;
  count: number;
}

export interface ScentHouseSummary {
  slug: string;
  name: string;
  count: number;
}

export interface ConcentrationShare {
  concentration: string;
  percentage: number;
}

export interface ScentProfile {
  topFamilies: ScentFamilyScore[]; // max 3
  topNotes: ScentNoteCount[]; // max 6
  concentrationPreference: string; // dominant, e.g. "EDP"
  concentrationBreakdown: ConcentrationShare[];
  genderPreference: string; // "Unisex" | "Masculin" | "Feminin"
  preferredHouses: ScentHouseSummary[]; // max 3
  profileType: string; // archetype name
  profileDescription: string;
  completeness: number; // 0-100
  /** True when there is too little data to render a meaningful profile. */
  needsMoreData: boolean;
  signalCount: number; // weighted number of analyzed items
}

interface Archetype {
  /** Family slugs that define the archetype. */
  families: string[];
  description: string;
}

// Eight archetypes. `The Explorer` is the fallback for users without a clear
// dominant pattern (an even spread across many families).
export const PROFILE_ARCHETYPES: Record<string, Archetype> = {
  "The Orientalist": {
    families: ["oriental", "amber", "woody"],
    description:
      "Ești atras de profunzime și mister. Parfumurile tale spun povești cu rășini calde, condimente și lemne prețioase — un sillage care rămâne în memorie.",
  },
  "The Fresh Seeker": {
    families: ["fresh", "aquatic", "citrus"],
    description:
      "Cauți claritate și lumină. Note acvatice, citrice scânteietoare și o senzație de aer curat definesc semnătura ta — vie, curată, energizantă.",
  },
  "The Romantic": {
    families: ["floral", "chypre", "white floral"],
    description:
      "Florile sunt limbajul tău. Buchete delicate și acorduri pudrate compun o eleganță atemporală, romantică și profund feminină în spirit.",
  },
  "The Epicurean": {
    families: ["gourmand", "oriental", "amber"],
    description:
      "Trăiești pentru plăcerile dulci. Vanilie, caramel, cacao și fructe coapte — parfumurile tale sunt o invitație la indulgență senzorială.",
  },
  "The Minimalist": {
    families: ["fresh", "fougere", "aromatic"],
    description:
      "Apreciezi rafinamentul discret. Acorduri curate, aromatice și esențiale — o eleganță sobră care nu strigă, ci doar șoptește calitatea.",
  },
  "The Bold": {
    families: ["oriental", "leather", "spicy"],
    description:
      "Nu te temi să fii remarcat. Piele, condimente intense și acorduri animalice — semnătura ta este afirmație pură, carismă și forță.",
  },
  "The Sophisticate": {
    families: ["chypre", "woody", "mossy"],
    description:
      "Întruchipezi eleganța clasică. Mușchi de stejar, lemne nobile și acorduri chypre structurate — un gust cultivat, sofisticat și sigur pe sine.",
  },
  "The Explorer": {
    families: [],
    description:
      "Gustul tău nu cunoaște granițe. Explorezi întregul spectru olfactiv cu curiozitate — de la florale la lemnoase, mereu în căutarea următoarei descoperiri.",
  },
};

const GENDER_LABEL: Record<Gender, string> = {
  [Gender.MASCULINE]: "Masculin",
  [Gender.FEMININE]: "Feminin",
  [Gender.UNISEX]: "Unisex",
};

const round = (n: number) => Math.round(n);

interface PerfumeSignal {
  familyId: string;
  familyName: string;
  familySlug: string;
  familyColor: string;
  houseSlug: string;
  houseName: string;
  concentration: string;
  gender: Gender;
  notes: { slug: string; name: string }[];
  weight: number;
}

function bestArchetype(topSlugs: string[]): string {
  if (topSlugs.length === 0) return "The Explorer";
  let best = "The Explorer";
  let bestScore = 0;
  for (const [name, def] of Object.entries(PROFILE_ARCHETYPES)) {
    if (def.families.length === 0) continue;
    // Higher rank (earlier in topSlugs) counts more.
    let score = 0;
    for (const fam of def.families) {
      const idx = topSlugs.indexOf(fam);
      if (idx !== -1) score += 3 - idx; // rank 0 → 3, rank 1 → 2, rank 2 → 1
    }
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }
  // No archetype matched the user's top families → Explorer.
  return bestScore > 0 ? best : "The Explorer";
}

async function compute(userId: string): Promise<ScentProfile> {
  const perfumeInclude = {
    family: { select: { name: true, slug: true, colorHex: true } },
    house: { select: { name: true, slug: true } },
    notes: { include: { note: { select: { name: true, slug: true } } } },
  };

  const [orderItems, wishlist] = await Promise.all([
    db.orderItem.findMany({
      where: { order: { userId } },
      select: {
        quantity: true,
        variant: {
          select: {
            perfume: {
              select: {
                familyId: true,
                gender: true,
                concentration: true,
                ...perfumeInclude,
              },
            },
          },
        },
      },
    }),
    db.wishlistItem.findMany({
      where: { userId },
      select: {
        perfume: {
          select: {
            familyId: true,
            gender: true,
            concentration: true,
            ...perfumeInclude,
          },
        },
      },
    }),
  ]);

  const signals: PerfumeSignal[] = [];
  const pushSignal = (
    p: {
      familyId: string;
      gender: Gender;
      concentration: string;
      family: { name: string; slug: string; colorHex: string };
      house: { name: string; slug: string };
      notes: { note: { name: string; slug: string } }[];
    },
    weight: number,
  ) => {
    signals.push({
      familyId: p.familyId,
      familyName: p.family.name,
      familySlug: p.family.slug,
      familyColor: p.family.colorHex,
      houseSlug: p.house.slug,
      houseName: p.house.name,
      concentration: p.concentration,
      gender: p.gender,
      notes: p.notes.map((n) => ({ slug: n.note.slug, name: n.note.name })),
      weight,
    });
  };

  for (const item of orderItems) {
    pushSignal(item.variant.perfume, WEIGHT_PURCHASE * Math.max(1, item.quantity));
  }
  for (const w of wishlist) {
    pushSignal(w.perfume, WEIGHT_WISHLIST);
  }

  const signalCount = signals.reduce((sum, s) => sum + s.weight, 0);

  // Completeness scales with weighted signal volume; ~24 weighted points → 100%.
  const completeness = Math.min(100, round((signalCount / 24) * 100));

  if (signals.length === 0 || completeness < 20) {
    return {
      topFamilies: [],
      topNotes: [],
      concentrationPreference: "",
      concentrationBreakdown: [],
      genderPreference: "",
      preferredHouses: [],
      profileType: "",
      profileDescription: "",
      completeness,
      needsMoreData: true,
      signalCount,
    };
  }

  // ---- Family scores -------------------------------------------------------
  const familyMap = new Map<
    string,
    { name: string; colorHex: string; score: number }
  >();
  for (const s of signals) {
    const cur = familyMap.get(s.familySlug) ?? {
      name: s.familyName,
      colorHex: s.familyColor,
      score: 0,
    };
    cur.score += s.weight;
    familyMap.set(s.familySlug, cur);
  }
  const familyTotal = [...familyMap.values()].reduce((a, f) => a + f.score, 0);
  const topFamilies: ScentFamilyScore[] = [...familyMap.entries()]
    .map(([slug, f]) => ({
      slug,
      name: f.name,
      colorHex: f.colorHex,
      score: f.score,
      percentage: familyTotal > 0 ? round((f.score / familyTotal) * 100) : 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // ---- Notes ---------------------------------------------------------------
  const noteMap = new Map<string, { name: string; count: number }>();
  for (const s of signals) {
    for (const n of s.notes) {
      const cur = noteMap.get(n.slug) ?? { name: n.name, count: 0 };
      cur.count += s.weight;
      noteMap.set(n.slug, cur);
    }
  }
  const topNotes: ScentNoteCount[] = [...noteMap.entries()]
    .map(([slug, n]) => ({ slug, name: n.name, count: n.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ---- Concentration -------------------------------------------------------
  const concMap = new Map<string, number>();
  for (const s of signals) {
    concMap.set(s.concentration, (concMap.get(s.concentration) ?? 0) + s.weight);
  }
  const concTotal = [...concMap.values()].reduce((a, b) => a + b, 0);
  const concentrationBreakdown: ConcentrationShare[] = [...concMap.entries()]
    .map(([concentration, score]) => ({
      concentration,
      percentage: concTotal > 0 ? round((score / concTotal) * 100) : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);
  const concentrationPreference = concentrationBreakdown[0]?.concentration ?? "";

  // ---- Gender --------------------------------------------------------------
  const genderMap = new Map<Gender, number>();
  for (const s of signals) {
    genderMap.set(s.gender, (genderMap.get(s.gender) ?? 0) + s.weight);
  }
  const dominantGender = [...genderMap.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];
  const genderPreference = dominantGender ? GENDER_LABEL[dominantGender] : "";

  // ---- Houses --------------------------------------------------------------
  const houseMap = new Map<string, { name: string; count: number }>();
  for (const s of signals) {
    const cur = houseMap.get(s.houseSlug) ?? { name: s.houseName, count: 0 };
    cur.count += s.weight;
    houseMap.set(s.houseSlug, cur);
  }
  const preferredHouses: ScentHouseSummary[] = [...houseMap.entries()]
    .map(([slug, h]) => ({ slug, name: h.name, count: h.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // ---- Archetype -----------------------------------------------------------
  const profileType = bestArchetype(topFamilies.map((f) => f.slug));
  const profileDescription = PROFILE_ARCHETYPES[profileType]?.description ?? "";

  return {
    topFamilies,
    topNotes,
    concentrationPreference,
    concentrationBreakdown,
    genderPreference,
    preferredHouses,
    profileType,
    profileDescription,
    completeness,
    needsMoreData: false,
    signalCount,
  };
}

/**
 * Build (and cache for an hour) a user's scent profile. Cache is keyed and
 * tagged per user so it can be invalidated on a new order if desired.
 */
export async function buildScentProfile(userId: string): Promise<ScentProfile> {
  const cached = unstable_cache(
    () => compute(userId),
    ["scent-profile", userId],
    { revalidate: 3600, tags: [`scent-profile:${userId}`] },
  );
  return cached();
}
