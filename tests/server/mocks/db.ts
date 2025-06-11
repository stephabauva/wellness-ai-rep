import {
  MemoryEntry,
  InsertMemoryEntry,
  MemoryTrigger,
  InsertMemoryTrigger,
  MemoryAccessLog,
  InsertMemoryAccessLog,
  Conversation,
  InsertConversation,
  ConversationMessage,
  InsertConversationMessage,
  File as DbFile, // Renaming to avoid conflict with global File type
  InsertFile,
} from '../../../shared/schema'; // Adjust path as necessary
import { v4 as uuidv4 } from 'uuid';

// --- Stores ---
export let mockMemoryEntriesStore: MemoryEntry[] = [];
export let mockMemoryTriggersStore: MemoryTrigger[] = [];
export let mockMemoryAccessLogStore: MemoryAccessLog[] = [];
export let mockConversationsStore: Conversation[] = [];
export let mockConversationMessagesStore: ConversationMessage[] = [];
export let mockFilesStore: DbFile[] = [];

// --- Reset Function ---
export const resetMockDb = () => {
  mockMemoryEntriesStore = [];
  mockMemoryTriggersStore = [];
  mockMemoryAccessLogStore = [];
  mockConversationsStore = [];
  mockConversationMessagesStore = [];
  mockFilesStore = [];
};

// --- Memory Entries ---
export const mockInsertMemoryEntry = (values: InsertMemoryEntry): MemoryEntry[] => {
  const now = new Date().toISOString();
  const newEntry: MemoryEntry = {
    id: uuidv4(),
    userId: values.userId,
    content: values.content,
    category: values.category,
    importanceScore: values.importanceScore || 0.5,
    keywords: values.keywords || [],
    embedding: values.embedding ? JSON.stringify(values.embedding) : JSON.stringify([]),
    sourceConversationId: values.sourceConversationId || null,
    sourceMessageId: values.sourceMessageId || null,
    lastAccessed: now,
    accessCount: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  mockMemoryEntriesStore.push(newEntry);
  return [newEntry]; // Simulate Drizzle's .returning()
};

export const mockSelectMemoryEntries = (criteria: {
  userId: number;
  isActive?: boolean;
  category?: string;
  ids?: string[];
}): MemoryEntry[] => {
  return mockMemoryEntriesStore.filter(entry => {
    let matches = entry.userId === criteria.userId;
    if (criteria.isActive !== undefined) matches = matches && entry.isActive === criteria.isActive;
    if (criteria.category !== undefined) matches = matches && entry.category === criteria.category;
    if (criteria.ids !== undefined) matches = matches && criteria.ids.includes(entry.id);
    return matches;
  }).map(entry => ({ ...entry, createdAt: new Date(entry.createdAt).toISOString(), updatedAt: new Date(entry.updatedAt).toISOString(), lastAccessed: new Date(entry.lastAccessed).toISOString() })); // Ensure dates are ISO strings
};

export const mockUpdateMemoryEntry = (
  id: string,
  updates: Partial<Omit<MemoryEntry, 'id' | 'userId' | 'createdAt' | 'embedding'>> & { embedding?: number[] }
): MemoryEntry[] => {
  const entryIndex = mockMemoryEntriesStore.findIndex(e => e.id === id);
  if (entryIndex === -1) return [];

  const updatedEntry = {
    ...mockMemoryEntriesStore[entryIndex],
    ...updates,
    embedding: updates.embedding ? JSON.stringify(updates.embedding) : mockMemoryEntriesStore[entryIndex].embedding,
    updatedAt: new Date().toISOString(),
    lastAccessed: updates.lastAccessed ? new Date(updates.lastAccessed).toISOString() : new Date(mockMemoryEntriesStore[entryIndex].lastAccessed).toISOString(),
    createdAt: new Date(mockMemoryEntriesStore[entryIndex].createdAt).toISOString(), // Keep original createdAt as ISO
  };
  mockMemoryEntriesStore[entryIndex] = updatedEntry;
  return [updatedEntry]; // Simulate Drizzle's .returning()
};

export const findMemoryEntryById = (id: string): MemoryEntry | undefined => {
  const entry = mockMemoryEntriesStore.find(e => e.id === id);
  if (entry) {
    return { ...entry, createdAt: new Date(entry.createdAt).toISOString(), updatedAt: new Date(entry.updatedAt).toISOString(), lastAccessed: new Date(entry.lastAccessed).toISOString() };
  }
  return undefined;
};

// --- Memory Triggers ---
export const mockInsertMemoryTrigger = (values: InsertMemoryTrigger): MemoryTrigger[] => {
  const newTrigger: MemoryTrigger = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    processed: values.processed || false,
    confidence: values.confidence || 0.5,
    triggerPhrase: values.triggerPhrase || null,
    memoryEntryId: values.memoryEntryId || null,
    messageId: values.messageId,
    triggerType: values.triggerType,
  };
  mockMemoryTriggersStore.push(newTrigger);
  return [newTrigger];
};

export const mockUpdateMemoryTrigger = (
  id: string,
  updates: Partial<InsertMemoryTrigger & { processed: boolean; memoryEntryId: string | null }>
): MemoryTrigger[] => {
  const triggerIndex = mockMemoryTriggersStore.findIndex(t => t.id === id);
  if (triggerIndex === -1) return [];
  mockMemoryTriggersStore[triggerIndex] = { ...mockMemoryTriggersStore[triggerIndex], ...updates } as MemoryTrigger;
  return [mockMemoryTriggersStore[triggerIndex]];
};

// --- Memory Access Log ---
export const mockInsertMemoryAccessLog = (values: InsertMemoryAccessLog): MemoryAccessLog[] => {
  const newLog: MemoryAccessLog = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    usedInResponse: values.usedInResponse || false,
    relevanceScore: values.relevanceScore || null,
    conversationId: values.conversationId || null,
    memoryEntryId: values.memoryEntryId,
  };
  mockMemoryAccessLogStore.push(newLog);
  return [newLog];
};

// --- Conversations ---
export const mockInsertConversation = (values: InsertConversation): Conversation[] => {
  const now = new Date().toISOString();
  const newConversation: Conversation = {
    id: uuidv4(),
    userId: values.userId,
    title: values.title || null,
    createdAt: now,
    updatedAt: now,
  };
  mockConversationsStore.push(newConversation);
  return [newConversation];
};

export const mockSelectConversationById = (id: string): Conversation | undefined => {
  const conv = mockConversationsStore.find(c => c.id === id);
  if (conv) {
    return { ...conv, createdAt: new Date(conv.createdAt).toISOString(), updatedAt: new Date(conv.updatedAt).toISOString() };
  }
  return undefined;
};

// --- Conversation Messages ---
export const mockInsertMessage = (values: InsertConversationMessage): ConversationMessage[] => {
  const newMessage: ConversationMessage = {
    id: uuidv4(),
    conversationId: values.conversationId,
    role: values.role,
    content: values.content,
    metadata: values.metadata ? (typeof values.metadata === 'string' ? values.metadata : JSON.stringify(values.metadata)) : null, // Ensure metadata is string or null
    createdAt: new Date().toISOString(),
  };
  // Handle attachments specifically for metadata as per spec
  if (values.metadata && (values.metadata as any).attachments) {
    newMessage.metadata = JSON.stringify({ attachments: (values.metadata as any).attachments });
  } else if (values.metadata) {
     newMessage.metadata = JSON.stringify(values.metadata);
  } else {
    newMessage.metadata = null; // Explicitly null if no metadata
  }


  mockConversationMessagesStore.push(newMessage);
  return [newMessage];
};

export const mockSelectMessagesByConversationId = (conversationId: string): ConversationMessage[] => {
  return mockConversationMessagesStore
    .filter(m => m.conversationId === conversationId)
    .map(m => ({...m, createdAt: new Date(m.createdAt).toISOString()}))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

// --- Files ---
export const mockInsertFile = (values: InsertFile): DbFile[] => {
  const now = new Date().toISOString();
  const newFile: DbFile = {
    id: uuidv4(),
    userId: values.userId,
    categoryId: values.categoryId || null,
    fileName: values.fileName,
    displayName: values.displayName,
    filePath: values.filePath,
    fileType: values.fileType,
    fileSize: values.fileSize,
    uploadSource: values.uploadSource || 'direct',
    conversationId: values.conversationId || null,
    messageId: values.messageId || null,
    retentionPolicy: values.retentionPolicy || 'medium',
    retentionDays: values.retentionDays === undefined ? (values.retentionPolicy === 'high' ? null : (values.retentionPolicy === 'medium' ? 90 : 30)) : values.retentionDays,
    scheduledDeletion: values.scheduledDeletion ? new Date(values.scheduledDeletion).toISOString() : null,
    isDeleted: values.isDeleted || false,
    deletedAt: values.deletedAt ? new Date(values.deletedAt).toISOString() : null,
    metadata: values.metadata ? (typeof values.metadata === 'string' ? values.metadata : JSON.stringify(values.metadata)) : null,
    createdAt: now,
    updatedAt: now,
  };
  mockFilesStore.push(newFile);
  return [newFile];
};

export const mockSelectFileById = (id: string): DbFile | undefined => {
    const file = mockFilesStore.find(f => f.id === id || f.fileName === id); // Allow lookup by fileName too for convenience
    if (file) {
        return {...file, createdAt: new Date(file.createdAt).toISOString(), updatedAt: new Date(file.updatedAt).toISOString() };
    }
    return undefined;
}

// --- Generic Drizzle-like select for vi.mock if needed ---
// This is a simplified version. A full mock would need to handle operators (eq, and, etc.)
export const mockSelect = (fields?: any) => ({
  from: (table: any) => ({
    where: (condition?: any) => {
      let storeToSearch: any[] = [];
      if (table.name === 'conversations') storeToSearch = mockConversationsStore;
      else if (table.name === 'conversationMessages') storeToSearch = mockConversationMessagesStore;
      else if (table.name === 'memoryEntries') storeToSearch = mockMemoryEntriesStore;
      // Add other tables as needed

      // Simplified filter (assumes condition is a function or direct ID match if simple)
      const results = condition ? storeToSearch.filter(condition) : storeToSearch;
      return {
        orderBy: (..._orderByArgs: any) => ({ // Accept orderBy args
            limit: (limitNum: number) => results.slice(0, limitNum),
            execute: () => results, // Drizzle-kit compatibility
        }),
        limit: (limitNum: number) => results.slice(0, limitNum),
        execute: () => results,
      };
    },
    orderBy: (..._orderByArgs: any) => ({ // Accept orderBy args
        limit: (limitNum: number) => mockConversationsStore.slice(0, limitNum), // Example default
        execute: () => mockConversationsStore, // Example default
    }),
    limit: (limitNum: number) => mockConversationsStore.slice(0, limitNum), // Example default
    execute: () => mockConversationsStore, // Example default
  }),
});
