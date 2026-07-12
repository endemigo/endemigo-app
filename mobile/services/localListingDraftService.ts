import * as FileSystem from 'expo-file-system/legacy';
import type {
  ProductCreateEntryMode,
  ProductCreateWizardState,
} from '../types/productCreate.ts';
import type { ListingDraftSummary } from './listingDraftService.ts';

// Misafir / satıcı-onayı-bekleyen kullanıcının taslakları cihazda tutulur.
// Backend /products/drafts satıcı yetkisi ister; bu yüzden yerel dosyaya yazarız.
const LOCAL_DRAFTS_FILE = `${FileSystem.documentDirectory ?? ''}guest-listing-drafts.json`;

export const LOCAL_DRAFT_ID_PREFIX = 'local:';

export function isLocalDraftId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(LOCAL_DRAFT_ID_PREFIX);
}

interface SaveLocalDraftInput {
  id?: string | null;
  entryMode: ProductCreateEntryMode;
  listingType: ProductCreateWizardState['listingType'];
  categoryId?: string | null;
  currentStep: number;
  state: ProductCreateWizardState;
}

function makeLocalId(): string {
  const rand = Math.floor(Math.random() * 1_000_000);
  return `${LOCAL_DRAFT_ID_PREFIX}${Date.now()}-${rand}`;
}

async function readAll(): Promise<ListingDraftSummary[]> {
  if (!FileSystem.documentDirectory) return [];
  try {
    const info = await FileSystem.getInfoAsync(LOCAL_DRAFTS_FILE);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(LOCAL_DRAFTS_FILE);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ListingDraftSummary => Boolean(item && item.id));
  } catch {
    // Bozuk/erişilemeyen dosya → boş liste (yerel taslak en fazla kaybolur, uygulama kilitlenmez).
    return [];
  }
}

async function writeAll(drafts: ListingDraftSummary[]): Promise<void> {
  if (!FileSystem.documentDirectory) return;
  await FileSystem.writeAsStringAsync(LOCAL_DRAFTS_FILE, JSON.stringify(drafts));
}

export async function listLocalListingDrafts(): Promise<ListingDraftSummary[]> {
  const drafts = await readAll();
  // En son güncellenen en üstte (backend list davranışıyla tutarlı).
  return [...drafts].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export async function getLocalListingDraft(id: string): Promise<ListingDraftSummary | null> {
  const drafts = await readAll();
  return drafts.find((draft) => draft.id === id) ?? null;
}

export async function saveLocalListingDraft(input: SaveLocalDraftInput): Promise<ListingDraftSummary> {
  const drafts = await readAll();
  const now = new Date().toISOString();
  const existing = input.id ? drafts.find((draft) => draft.id === input.id) : undefined;
  const summary: ListingDraftSummary = {
    id: existing?.id ?? input.id ?? makeLocalId(),
    entryMode: input.entryMode,
    listingType: input.listingType,
    categoryId: input.categoryId ?? null,
    currentStep: input.currentStep,
    status: 'DRAFT',
    payload: { rawState: input.state },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    isLocal: true,
  };
  const next = existing
    ? drafts.map((draft) => (draft.id === summary.id ? summary : draft))
    : [...drafts, summary];
  await writeAll(next);
  return summary;
}

export async function deleteLocalListingDraft(id: string): Promise<void> {
  const drafts = await readAll();
  await writeAll(drafts.filter((draft) => draft.id !== id));
}
