import { db, firebaseInitError, firebaseReady } from "../config/firebaseAdmin";

type SeedHeroBanner = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  highlight: string;
  isActive: boolean;
  sortOrder: number;
};

const HERO_BANNERS: SeedHeroBanner[] = [
  {
    id: "hero-banner-seed-001",
    eyebrow: "Welcome Home",
    title: "Encounter God In Worship",
    subtitle: "A house of prayer for every generation.",
    description:
      "Gather with us for Spirit-led worship, practical teaching, and a fresh encounter with Jesus every week.",
    imageUrl: "https://picsum.photos/seed/hero-banner-1/1400/900",
    primaryCtaLabel: "Join This Sunday",
    secondaryCtaLabel: "Plan Your Visit",
    highlight: "Prayer • Word • Fellowship",
    isActive: true,
    sortOrder: 0,
  },
  {
    id: "hero-banner-seed-002",
    eyebrow: "Grow In Grace",
    title: "Rooted In Scripture",
    subtitle: "Discipleship that transforms everyday life.",
    description:
      "Dive deeper into biblical truth through weekly teaching, guided devotion, and authentic community.",
    imageUrl: "https://picsum.photos/seed/hero-banner-2/1400/900",
    primaryCtaLabel: "Explore Ministries",
    secondaryCtaLabel: "Read Devotionals",
    highlight: "Bible Study • Mentorship • Prayer",
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "hero-banner-seed-003",
    eyebrow: "Do Life Together",
    title: "Built For Community",
    subtitle: "Faith, family, and purpose in one church home.",
    description:
      "Find caring leaders, meaningful friendships, and practical opportunities to serve in the body of Christ.",
    imageUrl: "https://picsum.photos/seed/hero-banner-3/1400/900",
    primaryCtaLabel: "Find A Life Group",
    secondaryCtaLabel: "Serve With Us",
    highlight: "Community • Care • Impact",
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "hero-banner-seed-004",
    eyebrow: "Prayer Changes Things",
    title: "Midweek Prayer Encounter",
    subtitle: "Strength for your week through focused prayer.",
    description:
      "Join our midweek gathering for intercession, worship, and encouragement as we seek God together.",
    imageUrl: "https://picsum.photos/seed/hero-banner-4/1400/900",
    primaryCtaLabel: "Request Prayer",
    secondaryCtaLabel: "Join Midweek",
    highlight: "Intercession • Worship • Hope",
    isActive: true,
    sortOrder: 3,
  },
  {
    id: "hero-banner-seed-005",
    eyebrow: "Next Generation",
    title: "Youth And Family Impact",
    subtitle: "Raising strong believers for every season.",
    description:
      "From children to young adults, we are committed to biblically grounded growth, leadership, and purpose.",
    imageUrl: "https://picsum.photos/seed/hero-banner-5/1400/900",
    primaryCtaLabel: "Get Involved",
    secondaryCtaLabel: "See Programs",
    highlight: "Family • Youth • Leadership",
    isActive: true,
    sortOrder: 4,
  },
];

async function seedHeroBanners() {
  if (!firebaseReady || !db || firebaseInitError) {
    throw new Error(
      `Firebase Admin is not ready. Verify FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in server/.env before seeding. ${firebaseInitError ? `Details: ${firebaseInitError}` : ""}`,
    );
  }

  const now = new Date().toISOString();
  const bannersRef = db.collection("heroBanners");
  const writeBatch = db.batch();

  HERO_BANNERS.forEach((banner) => {
    writeBatch.set(
      bannersRef.doc(banner.id),
      {
        ...banner,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
  });

  await writeBatch.commit();
  console.log(`Seeded ${HERO_BANNERS.length} hero banners into Firestore collection "heroBanners".`);
}

seedHeroBanners().catch((error) => {
  console.error("Failed to seed hero banners:", error);
  process.exit(1);
});
