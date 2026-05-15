import { db, firebaseInitError, firebaseReady } from "../config/firebaseAdmin.js";

type SeedDepartment = {
  id: string;
  name: string;
  description: string;
};

const DEPARTMENTS: SeedDepartment[] = [
  {
    id: "dept-seed-001",
    name: "Worship",
    description: "Coordinates worship leading, choir operations, and rehearsal planning.",
  },
  {
    id: "dept-seed-002",
    name: "Ushering",
    description: "Welcomes members and guests, supports seating flow, and service order.",
  },
  {
    id: "dept-seed-003",
    name: "Media",
    description: "Handles livestream, audio, projection, and service technical production.",
  },
  {
    id: "dept-seed-004",
    name: "Children Ministry",
    description: "Serves and disciples children through age-appropriate bible teaching.",
  },
  {
    id: "dept-seed-005",
    name: "Prayer",
    description: "Leads intercession, prayer coverage, and prayer-focused gatherings.",
  },
];

function stripUndefinedFields<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}

function safeMemberSummary(member: {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  imageUrl?: string;
}) {
  return stripUndefinedFields({
    memberId: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    imageUrl: member.imageUrl,
  });
}

async function seedDepartments() {
  if (!firebaseReady || !db || firebaseInitError) {
    throw new Error(
      `Firebase Admin is not ready. Verify FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in server/.env before seeding. ${firebaseInitError ? `Details: ${firebaseInitError}` : ""}`,
    );
  }

  const membersSnapshot = await db.collection("members").orderBy("createdAt", "desc").limit(80).get();

  const members = membersSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as {
      firstName?: string;
      lastName?: string;
      email?: string;
      imageUrl?: string;
    }),
  }));

  if (members.length === 0) {
    throw new Error("No members found. Seed members first using npm run seed:members.");
  }

  const now = new Date().toISOString();
  const departmentsRef = db.collection("departments");
  const writeBatch = db.batch();

  DEPARTMENTS.forEach((department, index) => {
    const start = index * 6;
    const segment = members.slice(start, start + 6);

    const membersPayload = segment.map((member, memberIndex) => {
      const role =
        memberIndex === 0
          ? "leader"
          : memberIndex === 1
            ? "assistant_leader"
            : "member";
      const status = memberIndex === 5 && index % 2 === 0 ? "suspended" : "active";

      return stripUndefinedFields({
        ...safeMemberSummary(member),
        role,
        status,
        addedAt: now,
        updatedAt: now,
        suspendedAt: status === "suspended" ? now : undefined,
        suspendedReason: status === "suspended" ? "Seeded as suspended for testing" : undefined,
      });
    });

    writeBatch.set(
      departmentsRef.doc(department.id),
      {
        name: department.name,
        description: department.description,
        members: membersPayload,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
  });

  await writeBatch.commit();
  console.log(`Seeded ${DEPARTMENTS.length} departments into Firestore collection \"departments\".`);
}

seedDepartments().catch((error) => {
  console.error("Failed to seed departments:", error);
  process.exit(1);
});