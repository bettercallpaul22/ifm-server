import { db, firebaseInitError, firebaseReady } from "../config/firebaseAdmin";

const TITLES = [
  "Young Adults Prayer Summit",
  "City Worship Night",
  "Marriage Enrichment Weekend",
  "Campus Revival Gathering",
  "Family Thanksgiving Service",
  "Leadership Development Bootcamp",
  "Holy Spirit Encounter",
  "Community Outreach Day",
  "Discipleship Intensive",
  "Women of Purpose Conference",
];

const LOCATIONS = [
  "Main Auditorium",
  "City Hall Arena",
  "Prayer Chapel",
  "Riverside Open Grounds",
  "Conference Hall B",
  "Youth Center",
];

const CATEGORIES = ["Prayer", "Conference", "Outreach", "Training", "Worship"];
const STATUSES = ["upcoming", "draft", "live", "completed"] as const;

function randomFrom<T>(list: readonly T[], index: number) {
  return list[index % list.length];
}

function buildIsoDate(offsetDays: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(17, 0, 0, 0);
  return date.toISOString();
}

async function seedPrograms() {
  if (!firebaseReady || !db || firebaseInitError) {
    throw new Error(
      `Firebase Admin is not ready. Verify FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in server/.env before seeding. ${firebaseInitError ? `Details: ${firebaseInitError}` : ""}`,
    );
  }

  const total = 14;
  const now = new Date().toISOString();
  const programsRef = db.collection("programs");
  const writeBatch = db.batch();

  for (let i = 0; i < total; i += 1) {
    const title = randomFrom(TITLES, i);
    const startDate = buildIsoDate(i * 3 + 2);
    const endDate = buildIsoDate(i * 3 + 3);
    const docId = `program-seed-${String(i + 1).padStart(3, "0")}`;

    writeBatch.set(
      programsRef.doc(docId),
      {
        title,
        description: `${title} is focused on spiritual growth, prayer, and community impact. Join us for teachings, worship, and practical sessions.`,
        imageUrl: `https://picsum.photos/seed/program-${i + 1}/1200/700`,
        location: randomFrom(LOCATIONS, i * 2),
        category: randomFrom(CATEGORIES, i * 3),
        status: randomFrom(STATUSES, i),
        startDate,
        endDate,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
  }

  await writeBatch.commit();
  console.log(`Seeded ${total} programs into Firestore collection \"programs\".`);
}

seedPrograms().catch((error) => {
  console.error("Failed to seed programs:", error);
  process.exit(1);
});