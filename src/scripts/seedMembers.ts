import { db, firebaseInitError, firebaseReady } from "../config/firebaseAdmin";

const FIRST_NAMES = [
  "Daniel",
  "Grace",
  "Michael",
  "Ruth",
  "Samuel",
  "Esther",
  "David",
  "Mercy",
  "John",
  "Deborah",
  "Emmanuel",
  "Joy",
  "Paul",
  "Faith",
  "Peter",
  "Hannah",
  "Victor",
  "Naomi",
];

const LAST_NAMES = [
  "Adewale",
  "Okafor",
  "Bassey",
  "Ibrahim",
  "Johnson",
  "Afolabi",
  "Eze",
  "Ahmed",
  "Obi",
  "Nwosu",
  "Yakubu",
  "Musa",
  "Okeke",
  "Ojo",
  "Balogun",
  "Udo",
  "Nnamdi",
  "Alabi",
];

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu", "Benin City", "Kano"];
const COUNTRIES = ["Nigeria", "Ghana", "Kenya"];

function randomFrom<T>(list: T[], index: number) {
  return list[index % list.length];
}

function buildDateOfBirth(index: number) {
  const year = 1975 + (index % 30);
  const month = (index % 12) + 1;
  const day = (index % 28) + 1;
  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

function buildPhone(index: number) {
  const suffix = `${10000000 + index}`.slice(-8);
  return `+23480${suffix}`;
}

async function seedMembers() {
  if (!firebaseReady || !db || firebaseInitError) {
    throw new Error(
      `Firebase Admin is not ready. Verify FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in server/.env before seeding. ${firebaseInitError ? `Details: ${firebaseInitError}` : ""}`,
    );
  }

  const total = 87;
  const membersRef = db.collection("members");
  const now = new Date().toISOString();

  const writeBatch = db.batch();

  for (let i = 0; i < total; i += 1) {
    const firstName = randomFrom(FIRST_NAMES, i);
    const lastName = randomFrom(LAST_NAMES, i * 2);
    const city = randomFrom(CITIES, i * 3);
    const country = randomFrom(COUNTRIES, i * 5);
    const gender = i % 3 === 0 ? "male" : i % 3 === 1 ? "female" : "other";
    const membershipStatus = i % 5 === 0 ? "pending" : i % 7 === 0 ? "inactive" : "active";
    const docId = `seed-${String(i + 1).padStart(3, "0")}`;
    const imageUrl = i % 4 === 0 ? undefined : `https://i.pravatar.cc/200?img=${(i % 70) + 1}`;

    const payload = {
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${String(i + 1).padStart(3, "0")}@example.org`,
      imageUrl,
      phone: buildPhone(i + 1),
      dateOfBirth: buildDateOfBirth(i + 1),
      gender,
      address: `${(i % 120) + 1} Hope Street`,
      city,
      country,
      membershipStatus,
      notes: `Seeded member record #${i + 1}`,
      createdAt: now,
      updatedAt: now,
    };

    writeBatch.set(membersRef.doc(docId), payload, { merge: true });
  }

  await writeBatch.commit();
  console.log(`Seeded ${total} members into Firestore collection \"members\".`);
}

seedMembers().catch((error) => {
  console.error("Failed to seed members:", error);
  process.exit(1);
});
