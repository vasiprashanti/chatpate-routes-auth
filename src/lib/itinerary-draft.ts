const DB_NAME = "chatpate-itinerary-draft";
const STORE_NAME = "drafts";
const DRAFT_KEY = "pending";

export type ItineraryDraftData = {
  submission_method: "manual" | "pdf";
  title: string;
  destination: string;
  starting_location: string;
  travel_months: string[];
  duration: string;
  estimated_budget: number | null;
  itinerary_details: string;
  additional_notes: string;
  cohost_interest: "yes" | "no" | "maybe";
  submitter_name: string;
  email: string;
  phone: string;
  consent: boolean;
};

type SavedDraft = { data: ItineraryDraftData; file: File | null };

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveItineraryDraft(data: ItineraryDraftData, file: File | null) {
  const db = await openDraftDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ data, file } satisfies SavedDraft, DRAFT_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export async function loadItineraryDraft(): Promise<SavedDraft | null> {
  const db = await openDraftDb();
  const saved = await new Promise<SavedDraft | null>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(DRAFT_KEY);
    request.onsuccess = () => resolve((request.result as SavedDraft | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return saved;
}

export async function clearItineraryDraft() {
  const db = await openDraftDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(DRAFT_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}
