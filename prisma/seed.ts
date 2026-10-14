import {
  PrismaClient,
  Gender,
  Concentration,
  NotePosition,
  CouponType,
  UserRole,
} from "@prisma/client";

// Standalone client — the seed runs outside Next.js (`tsx prisma/seed.ts`),
// so we avoid the app's path-aliased imports and use a local instance.
const db = new PrismaClient();

const sku = (slug: string, sizeML: number) =>
  `${slug.toUpperCase().replace(/-/g, "")}-${sizeML}ML`;

const img = (slug: string, n: number) =>
  `https://picsum.photos/seed/${slug}-${n}/900/1200`;

// ----------------------------------------------------------------------------
//  Reference data
// ----------------------------------------------------------------------------

const families = [
  {
    name: "Floral",
    slug: "floral",
    description:
      "Compoziții construite în jurul florilor — trandafir, iasomie, lăcrămioare — elegante și luminoase.",
    colorHex: "#E8A0BF",
    iconName: "Flower2",
  },
  {
    name: "Lemnos",
    slug: "lemnos",
    description:
      "Acorduri calde și seci de santal, cedru și vetiver, care dau profunzime și ținută.",
    colorHex: "#9C7E32",
    iconName: "TreePine",
  },
  {
    name: "Ambrat",
    slug: "ambrat",
    description:
      "Inimi orientale, opulente, cu ambră, vanilie și rășini — senzuale și de durată.",
    colorHex: "#C8651B",
    iconName: "Flame",
  },
];

const notes = [
  { name: "Bergamotă", slug: "bergamota", family: "citrice", description: "Citric scânteietor, ușor floral, din coaja de bergamotă de Calabria." },
  { name: "Ananas", slug: "ananas", family: "fructat", description: "Notă fructată, suculentă și efervescentă." },
  { name: "Coacăze negre", slug: "coacaze-negre", family: "fructat", description: "Cassis intens, acrișor și puțin verde." },
  { name: "Trandafir", slug: "trandafir", family: "floral", description: "Reginei florilor — catifelat, profund, ușor mieros." },
  { name: "Iasomie", slug: "iasomie", family: "floral", description: "Albă, opulentă și narcotică, miezul multor parfumuri de lux." },
  { name: "Oud", slug: "oud", family: "lemnos", description: "Lemn de agar rar, animalic și balsamic, semnătura parfumeriei de nișă." },
  { name: "Ambră gri", slug: "ambra-gri", family: "animalic", description: "Salină, caldă și mineralică, oferă o aură luminoasă." },
  { name: "Vanilie", slug: "vanilie", family: "gurmand", description: "Dulce, cremoasă și învăluitoare, din păstăi de Madagascar." },
  { name: "Santal", slug: "santal", family: "lemnos", description: "Lemn cremos și lăptos, catifelat și persistent." },
  { name: "Mosc", slug: "mosc", family: "animalic", description: "Cald, pudrat și senzual, învăluie compoziția ca o a doua piele." },
];

const houses = [
  {
    name: "Creed",
    slug: "creed",
    country: "Franța / Anglia",
    foundedYear: 1760,
    website: "https://www.creedboutique.com",
    description:
      "Una dintre cele mai vechi case de parfumuri din lume, sinonimă cu rafinamentul britanic și savoir-faire-ul francez.",
    story:
      "Fondată în 1760 la Londra ca atelier de croitorie, Creed a confecționat parfumuri pentru curțile regale ale Europei înainte de a deveni o casă de parfumerie independentă. Astăzi, Aventus rămâne unul dintre cele mai influente parfumuri masculine din istoria modernă.",
  },
  {
    name: "Xerjoff",
    slug: "xerjoff",
    country: "Italia",
    foundedYear: 2007,
    website: "https://www.xerjoff.com",
    description:
      "Lux italian extravagant, cu ingrediente rare și flacoane bijuterie.",
    story:
      "Născută la Torino din pasiunea lui Sergio Momo, Xerjoff combină materii prime prețioase cu un design opulent, situându-se la granița dintre parfumerie și artă decorativă.",
  },
  {
    name: "Amouage",
    slug: "amouage",
    country: "Oman",
    foundedYear: 1983,
    website: "https://www.amouage.com",
    description:
      "Casa de lux a Orientului, celebră pentru oud, tămâie și compoziții monumentale.",
    story:
      "Înființată prin decret regal în Sultanatul Oman, Amouage folosește ingrediente emblematice ale Arabiei — tămâie de Boswellia, trandafir și oud — pentru a crea parfumuri de o bogăție somptuoasă.",
  },
  {
    name: "Initio Parfums Privés",
    slug: "initio",
    country: "Franța",
    foundedYear: 2015,
    website: "https://www.initioparfums.com",
    description:
      "Parfumuri concepute ca „elixiruri” cu molecule de atracție și concentrații foarte ridicate.",
    story:
      "Initio explorează puterea parfumului asupra simțurilor, combinând ingrediente nobile cu accente moderne și o concentrație generoasă pentru un sillage memorabil.",
  },
  {
    name: "Maison Francis Kurkdjian",
    slug: "maison-francis-kurkdjian",
    country: "Franța",
    foundedYear: 2009,
    website: "https://www.franciskurkdjian.com",
    description:
      "Eleganță pariziană contemporană, semnată de unul dintre cei mai aclamați parfumieri în viață.",
    story:
      "Francis Kurkdjian, creatorul unora dintre cele mai vândute parfumuri ale secolului, și-a fondat propria maison pentru a-și exprima viziunea — culminând cu fenomenul Baccarat Rouge 540.",
  },
];

interface SeedVariant {
  sizeML: number;
  price: number;
  quantity: number;
}
interface SeedPerfume {
  name: string;
  slug: string;
  houseSlug: string;
  familySlug: string;
  gender: Gender;
  concentration: Concentration;
  launchYear: number;
  perfumer: string;
  isFeatured: boolean;
  description: string;
  story: string;
  metaTitle: string;
  metaDescription: string;
  notes: { slug: string; position: NotePosition }[];
  variants: SeedVariant[];
}

const T = NotePosition.TOP;
const H = NotePosition.HEART;
const B = NotePosition.BASE;

const perfumes: SeedPerfume[] = [
  {
    name: "Aventus",
    slug: "creed-aventus",
    houseSlug: "creed",
    familySlug: "lemnos",
    gender: Gender.MASCULINE,
    concentration: Concentration.EDP,
    launchYear: 2010,
    perfumer: "Olivier Creed & Erwin Creed",
    isFeatured: true,
    description:
      "Un chypre fructat-afumat devenit legendă: ananas scânteietor, fum de mesteacăn și un fond mineralic de ambră gri.",
    story:
      "Inspirat de viața împăratului Napoleon, Aventus celebrează forța, viziunea și succesul. Lansat în 2010, a redefinit parfumeria masculină modernă.",
    metaTitle: "Decant Creed Aventus — chypre fructat afumat",
    metaDescription:
      "Testează Creed Aventus în decanturi de 2, 5 sau 10 ml. Ananas, coacăze negre, mesteacăn și ambră gri.",
    notes: [
      { slug: "ananas", position: T },
      { slug: "bergamota", position: T },
      { slug: "coacaze-negre", position: T },
      { slug: "trandafir", position: H },
      { slug: "iasomie", position: H },
      { slug: "ambra-gri", position: B },
      { slug: "mosc", position: B },
      { slug: "santal", position: B },
    ],
    variants: [
      { sizeML: 2, price: 39, quantity: 40 },
      { sizeML: 5, price: 89, quantity: 25 },
      { sizeML: 10, price: 159, quantity: 12 },
    ],
  },
  {
    name: "Green Irish Tweed",
    slug: "creed-green-irish-tweed",
    houseSlug: "creed",
    familySlug: "floral",
    gender: Gender.MASCULINE,
    concentration: Concentration.EDP,
    launchYear: 1985,
    perfumer: "Olivier Creed & Pierre Bourdon",
    isFeatured: false,
    description:
      "Un clasic verde-proaspăt, elegant și aristocratic, cu iasomie și un fond cremos de santal.",
    story:
      "Purtat de personalități și lideri, Green Irish Tweed a definit eleganța masculină verde încă din anii '80.",
    metaTitle: "Decant Creed Green Irish Tweed",
    metaDescription:
      "Creed Green Irish Tweed în decanturi. Verde proaspăt, iasomie, santal și mosc.",
    notes: [
      { slug: "bergamota", position: T },
      { slug: "iasomie", position: H },
      { slug: "santal", position: B },
      { slug: "mosc", position: B },
    ],
    variants: [
      { sizeML: 2, price: 35, quantity: 30 },
      { sizeML: 5, price: 79, quantity: 18 },
      { sizeML: 10, price: 139, quantity: 9 },
    ],
  },
  {
    name: "Naxos",
    slug: "xerjoff-naxos",
    houseSlug: "xerjoff",
    familySlug: "ambrat",
    gender: Gender.MASCULINE,
    concentration: Concentration.EDP,
    launchYear: 2015,
    perfumer: "Chris Maurice",
    isFeatured: true,
    description:
      "Tutun mieros, lavandă și miere peste un fond cald de vanilie și santal — un gurmand aromatic somptuos.",
    story:
      "Parte din colecția Join the Club, Naxos evocă rafinamentul mediteraneean și luxul dolce vita.",
    metaTitle: "Decant Xerjoff Naxos — tutun & miere",
    metaDescription:
      "Xerjoff Naxos în decanturi de 2, 5, 10 ml. Bergamotă, iasomie, vanilie, santal.",
    notes: [
      { slug: "bergamota", position: T },
      { slug: "iasomie", position: H },
      { slug: "vanilie", position: B },
      { slug: "santal", position: B },
    ],
    variants: [
      { sizeML: 2, price: 45, quantity: 22 },
      { sizeML: 5, price: 99, quantity: 14 },
      { sizeML: 10, price: 179, quantity: 6 },
    ],
  },
  {
    name: "Erba Pura",
    slug: "xerjoff-erba-pura",
    houseSlug: "xerjoff",
    familySlug: "ambrat",
    gender: Gender.UNISEX,
    concentration: Concentration.EDP,
    launchYear: 2017,
    perfumer: "Xerjoff",
    isFeatured: false,
    description:
      "O explozie fructată de citrice și fructe siropoase peste un fond de ambră, vanilie și mosc alb.",
    story:
      "Erba Pura este unul dintre cele mai iubite parfumuri Xerjoff, sinonim cu bună dispoziție și opulență fructată.",
    metaTitle: "Decant Xerjoff Erba Pura",
    metaDescription:
      "Xerjoff Erba Pura în decanturi. Fructe, citrice, ambră, vanilie și mosc.",
    notes: [
      { slug: "bergamota", position: T },
      { slug: "ananas", position: T },
      { slug: "coacaze-negre", position: T },
      { slug: "iasomie", position: H },
      { slug: "vanilie", position: B },
      { slug: "mosc", position: B },
    ],
    variants: [
      { sizeML: 2, price: 42, quantity: 26 },
      { sizeML: 5, price: 95, quantity: 16 },
      { sizeML: 10, price: 169, quantity: 0 },
    ],
  },
  {
    name: "Interlude Man",
    slug: "amouage-interlude-man",
    houseSlug: "amouage",
    familySlug: "ambrat",
    gender: Gender.MASCULINE,
    concentration: Concentration.EDP,
    launchYear: 2012,
    perfumer: "Pierre Negrin",
    isFeatured: true,
    description:
      "Un colos rezinos și afumat: tămâie, oregano, oud și ambră gri într-un haos magnific și ordonat.",
    story:
      "Interlude reprezintă momentul de tumult dinaintea liniștii — o capodoperă a stilului Amouage, intensă și teatrală.",
    metaTitle: "Decant Amouage Interlude Man — oud & tămâie",
    metaDescription:
      "Amouage Interlude Man în decanturi. Bergamotă, oud, ambră gri și santal.",
    notes: [
      { slug: "bergamota", position: T },
      { slug: "iasomie", position: H },
      { slug: "oud", position: B },
      { slug: "ambra-gri", position: B },
      { slug: "santal", position: B },
    ],
    variants: [
      { sizeML: 2, price: 49, quantity: 20 },
      { sizeML: 5, price: 109, quantity: 10 },
      { sizeML: 10, price: 199, quantity: 4 },
    ],
  },
  {
    name: "Reflection Man",
    slug: "amouage-reflection-man",
    houseSlug: "amouage",
    familySlug: "floral",
    gender: Gender.MASCULINE,
    concentration: Concentration.EDP,
    launchYear: 2007,
    perfumer: "Lucas Sieuzac",
    isFeatured: false,
    description:
      "Un floral masculin senin și cristalin: iasomie și neroli peste un fond luminos de santal și mosc.",
    story:
      "Reflection Man surprinde echilibrul și seninătatea — o reflexie elegantă a personalității celui care îl poartă.",
    metaTitle: "Decant Amouage Reflection Man",
    metaDescription:
      "Amouage Reflection Man în decanturi. Iasomie, trandafir, santal și mosc.",
    notes: [
      { slug: "bergamota", position: T },
      { slug: "iasomie", position: H },
      { slug: "trandafir", position: H },
      { slug: "santal", position: B },
      { slug: "mosc", position: B },
    ],
    variants: [
      { sizeML: 2, price: 47, quantity: 24 },
      { sizeML: 5, price: 105, quantity: 12 },
      { sizeML: 10, price: 189, quantity: 7 },
    ],
  },
  {
    name: "Oud for Greatness",
    slug: "initio-oud-for-greatness",
    houseSlug: "initio",
    familySlug: "lemnos",
    gender: Gender.UNISEX,
    concentration: Concentration.EXTRAIT,
    launchYear: 2018,
    perfumer: "Initio",
    isFeatured: true,
    description:
      "Oud măreț, șofran și nucșoară peste un fond lemnos-aromatic — putere și sillage colosal.",
    story:
      "Parte din colecția Oud for Greatness, acest elixir transformă oudul într-o declarație de forță și prestigiu.",
    metaTitle: "Decant Initio Oud for Greatness",
    metaDescription:
      "Initio Oud for Greatness în decanturi. Oud, iasomie, santal și mosc.",
    notes: [
      { slug: "bergamota", position: T },
      { slug: "iasomie", position: H },
      { slug: "oud", position: B },
      { slug: "santal", position: B },
      { slug: "mosc", position: B },
    ],
    variants: [
      { sizeML: 2, price: 44, quantity: 28 },
      { sizeML: 5, price: 99, quantity: 15 },
      { sizeML: 10, price: 179, quantity: 8 },
    ],
  },
  {
    name: "Baccarat Rouge 540",
    slug: "mfk-baccarat-rouge-540",
    houseSlug: "maison-francis-kurkdjian",
    familySlug: "ambrat",
    gender: Gender.UNISEX,
    concentration: Concentration.EXTRAIT,
    launchYear: 2015,
    perfumer: "Francis Kurkdjian",
    isFeatured: true,
    description:
      "Iconicul acord amber-floral: șofran, iasomie, ambră gri și un lemn cedrat luminos, aproape mineral.",
    story:
      "Creat inițial pentru a aniversa 250 de ani ai manufacturii de cristal Baccarat, Baccarat Rouge 540 a devenit unul dintre cele mai influente parfumuri ale deceniului.",
    metaTitle: "Decant MFK Baccarat Rouge 540 — extrait",
    metaDescription:
      "Baccarat Rouge 540 Extrait în decanturi de 2, 5, 10 ml. Iasomie, ambră gri, vanilie, santal.",
    notes: [
      { slug: "bergamota", position: T },
      { slug: "iasomie", position: H },
      { slug: "ambra-gri", position: B },
      { slug: "vanilie", position: B },
      { slug: "santal", position: B },
    ],
    variants: [
      { sizeML: 2, price: 55, quantity: 35 },
      { sizeML: 5, price: 125, quantity: 20 },
      { sizeML: 10, price: 229, quantity: 10 },
    ],
  },
];

// ----------------------------------------------------------------------------
//  Demo engagement data
// ----------------------------------------------------------------------------

const DEMO_CUSTOMER_ID = "seed_demo_customer";

const coupons = [
  {
    code: "WELCOME10",
    type: CouponType.PERCENTAGE,
    value: 10,
    minOrderAmount: 100,
    maxUsageCount: 1000,
  },
  {
    code: "NICHE50",
    type: CouponType.FIXED_AMOUNT,
    value: 50,
    minOrderAmount: 300,
    maxUsageCount: 200,
  },
];

// ----------------------------------------------------------------------------
//  Seed runner
// ----------------------------------------------------------------------------

async function main() {
  console.log("🌱 Seeding database…");

  // Families
  const familyMap = new Map<string, string>();
  for (const f of families) {
    const row = await db.olfactoryFamily.upsert({
      where: { slug: f.slug },
      create: f,
      update: f,
    });
    familyMap.set(f.slug, row.id);
  }
  console.log(`  • ${families.length} olfactory families`);

  // Notes
  const noteMap = new Map<string, string>();
  for (const n of notes) {
    const row = await db.olfactoryNote.upsert({
      where: { slug: n.slug },
      create: n,
      update: n,
    });
    noteMap.set(n.slug, row.id);
  }
  console.log(`  • ${notes.length} olfactory notes`);

  // Houses
  const houseMap = new Map<string, string>();
  for (const h of houses) {
    const row = await db.perfumeHouse.upsert({
      where: { slug: h.slug },
      create: { ...h, logoUrl: img(`${h.slug}-logo`, 1), coverImageUrl: img(`${h.slug}-cover`, 2) },
      update: h,
    });
    houseMap.set(h.slug, row.id);
  }
  console.log(`  • ${houses.length} perfume houses`);

  // Perfumes (+ images, notes, variants, inventory)
  for (const p of perfumes) {
    const houseId = houseMap.get(p.houseSlug);
    const familyId = familyMap.get(p.familySlug);
    if (!houseId || !familyId) {
      throw new Error(`Missing house/family for ${p.slug}`);
    }

    const perfume = await db.perfume.upsert({
      where: { slug: p.slug },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        story: p.story,
        gender: p.gender,
        concentration: p.concentration,
        launchYear: p.launchYear,
        perfumer: p.perfumer,
        isFeatured: p.isFeatured,
        isActive: true,
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
        house: { connect: { id: houseId } },
        family: { connect: { id: familyId } },
      },
      update: {
        name: p.name,
        description: p.description,
        story: p.story,
        gender: p.gender,
        concentration: p.concentration,
        launchYear: p.launchYear,
        perfumer: p.perfumer,
        isFeatured: p.isFeatured,
        house: { connect: { id: houseId } },
        family: { connect: { id: familyId } },
      },
    });

    await db.perfumeImage.deleteMany({ where: { perfumeId: perfume.id } });
    await db.perfumeImage.createMany({
      data: [0, 1].map((i) => ({
        perfumeId: perfume.id,
        url: img(p.slug, i + 1),
        altText: `${p.name} — decant ${i + 1}`,
        position: i,
        isPrimary: i === 0,
      })),
    });

    await db.perfumeNote.deleteMany({ where: { perfumeId: perfume.id } });
    await db.perfumeNote.createMany({
      data: p.notes.map((n) => {
        const noteId = noteMap.get(n.slug);
        if (!noteId) throw new Error(`Missing note ${n.slug} for ${p.slug}`);
        return { perfumeId: perfume.id, noteId, position: n.position };
      }),
    });

    for (const v of p.variants) {
      const variant = await db.decantVariant.upsert({
        where: { perfumeId_sizeML: { perfumeId: perfume.id, sizeML: v.sizeML } },
        create: {
          perfumeId: perfume.id,
          sizeML: v.sizeML,
          price: v.price,
          currency: "RON",
          sku: sku(p.slug, v.sizeML),
          isActive: true,
        },
        update: { price: v.price, isActive: true },
      });
      await db.inventory.upsert({
        where: { variantId: variant.id },
        create: {
          variantId: variant.id,
          quantity: v.quantity,
          lowStockThreshold: 5,
        },
        update: { quantity: v.quantity },
      });
    }
  }
  console.log(`  • ${perfumes.length} perfumes with variants, images & notes`);

  // Demo customer + a couple of approved reviews so ratings render.
  await db.user.upsert({
    where: { id: DEMO_CUSTOMER_ID },
    create: {
      id: DEMO_CUSTOMER_ID,
      email: "demo@decanturi-niche.local",
      firstName: "Andrei",
      lastName: "Popescu",
      role: UserRole.CUSTOMER,
    },
    update: {},
  });

  const aventus = await db.perfume.findUnique({
    where: { slug: "creed-aventus" },
    select: { id: true },
  });
  const baccarat = await db.perfume.findUnique({
    where: { slug: "mfk-baccarat-rouge-540" },
    select: { id: true },
  });

  if (aventus) {
    await db.review.upsert({
      where: {
        userId_perfumeId: { userId: DEMO_CUSTOMER_ID, perfumeId: aventus.id },
      },
      create: {
        userId: DEMO_CUSTOMER_ID,
        perfumeId: aventus.id,
        rating: 5,
        title: "Un must-have absolut",
        body: "Proiecție excelentă și un dry-down fenomenal. Decantul de 5 ml a fost perfect pentru a-l testa câteva săptămâni.",
        isVerifiedPurchase: true,
        isApproved: true,
        helpfulCount: 12,
      },
      update: {},
    });
  }
  if (baccarat) {
    await db.review.upsert({
      where: {
        userId_perfumeId: { userId: DEMO_CUSTOMER_ID, perfumeId: baccarat.id },
      },
      create: {
        userId: DEMO_CUSTOMER_ID,
        perfumeId: baccarat.id,
        rating: 4,
        title: "Iconic, dar foarte puternic",
        body: "Câteva pufuri sunt suficiente. Acordul amber-floral este inconfundabil. Recomand decantul de 2 ml pentru început.",
        isVerifiedPurchase: true,
        isApproved: true,
        helpfulCount: 7,
      },
      update: {},
    });
  }
  console.log("  • demo customer + 2 approved reviews");

  // Coupons
  for (const c of coupons) {
    await db.couponCode.upsert({
      where: { code: c.code },
      create: c,
      update: c,
    });
  }
  console.log(`  • ${coupons.length} coupon codes`);

  // --------------------------------------------------------------------------
  //  Phase 6 — subscription plans
  // --------------------------------------------------------------------------
  const plans = [
    {
      name: "Discovery Box",
      description:
        "4 decanturi de 2ml selectate lunar de experții noștri, din case diferite.",
      price: 149,
      stripePriceId:
        process.env.STRIPE_DISCOVERY_BOX_PRICE_ID || "price_discovery_box_dev",
      decantCount: 4,
      sizeML: 2,
      features: [
        "4 decanturi de 2ml selectate de experți",
        "Din case diferite în fiecare lună",
        "Surpriză garantată",
        "+50 puncte loyalty/lună",
      ],
      isFeatured: false,
    },
    {
      name: "Connoisseur Box",
      description:
        "5 decanturi premium (mix 2ml + 5ml) cu o notă personalizată de la curator.",
      price: 249,
      stripePriceId:
        process.env.STRIPE_CONNOISSEUR_BOX_PRICE_ID || "price_connoisseur_box_dev",
      decantCount: 5,
      sizeML: 5,
      features: [
        "5 decanturi (mix 2ml + 5ml)",
        "Parfumuri premium și rare",
        "Notă personalizată de la curator",
        "+100 puncte loyalty/lună",
        "Livrare gratuită garantată",
      ],
      isFeatured: true,
    },
  ];
  for (const p of plans) {
    await db.subscriptionPlan.upsert({
      where: { stripePriceId: p.stripePriceId },
      create: p,
      update: p,
    });
  }
  console.log(`  • ${plans.length} subscription plans`);

  // --------------------------------------------------------------------------
  //  Phase 6 — product bundles / discovery sets
  // --------------------------------------------------------------------------
  async function seedBundle(
    slug: string,
    name: string,
    description: string,
    price: number,
    sizeML: number,
    count: number,
    skip: number,
  ) {
    const variants = await db.decantVariant.findMany({
      where: { sizeML, isActive: true },
      take: count,
      skip,
      orderBy: { createdAt: "asc" },
    });
    if (variants.length === 0) {
      console.warn(`    ! no ${sizeML}ml variants for bundle "${name}", skipping`);
      return;
    }
    const bundle = await db.bundle.upsert({
      where: { slug },
      create: { slug, name, description, price, imageUrl: img(slug, 1) },
      update: { name, description, price },
    });
    await db.bundleItem.deleteMany({ where: { bundleId: bundle.id } });
    await db.bundleItem.createMany({
      data: variants.map((v) => ({
        bundleId: bundle.id,
        variantId: v.id,
        quantity: 1,
      })),
      skipDuplicates: true,
    });
  }

  await seedBundle(
    "starter-discovery-kit",
    "Starter Discovery Kit",
    "5 decanturi de 2ml din familii diferite — punctul perfect de plecare în lumea parfumurilor de nișă.",
    89,
    2,
    5,
    0,
  );
  await seedBundle(
    "oriental-nights-set",
    "Oriental Nights Set",
    "3 decanturi de 5ml din cele mai senzuale compoziții orientale și oud.",
    149,
    5,
    3,
    0,
  );
  await seedBundle(
    "fresh-office-collection",
    "Fresh Office Collection",
    "4 decanturi de 2ml proaspete și aquatic, ideale pentru birou și zilele calde.",
    69,
    2,
    4,
    5,
  );
  await seedBundle(
    "luxury-niche-box",
    "Luxury Niche Box",
    "3 decanturi de 10ml din cele mai exclusiviste case premium.",
    299,
    10,
    3,
    0,
  );
  console.log("  • product bundles");

  console.log("✅ Seed complete.");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
