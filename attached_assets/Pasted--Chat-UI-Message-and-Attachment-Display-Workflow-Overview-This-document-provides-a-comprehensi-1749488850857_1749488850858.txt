
# Chat UI Message and Attachment Display Workflow

## Overview
This document provides a comprehensive technical explanation of how messages and attachments are displayed in the AI Wellness Coach chat UI. It covers the complete flow from user input to display, including client-side state management, backend processing, database storage, and visual rendering.

## System Architecture

### High-Level Flow
1. **User Input** → **Client Processing** → **Backend API** → **AI Service** → **Database Storage** → **Response Display**
2. **File Upload** → **Storage Processing** → **Attachment Metadata** → **Visual Display** → **Context Persistence**

## Client-Side Workflow

### 1. Chat Interface Components

#### Primary Component: `ChatSection.tsx`
- **Location**: `client/src/components/ChatSection.tsx`
- **Purpose**: Main chat interface orchestrating all chat interactions
- **Key Features**:
  - Message input and display
  - File attachment management
  - Audio recording integration
  - Conversation history navigation

#### State Management Hooks:
- **`useChatMessages.ts`**: Manages message state, conversation context, and API calls
- **`useFileManagement.ts`**: Handles file uploads, attachment state, and file operations
- **`useReportGeneration.ts`**: Manages PDF report generation

### 2. Message Input and Processing

#### Text Input Flow:
```typescript
// User types message in Input component
const [inputMessage, setInputMessage] = useState("");

// On send (Enter key or Send button click)
const handleSendMessage = () => {
  if (inputMessage.trim() || attachedFiles.length > 0) {
    sendMessageMutation.mutate({
      content: inputMessage,
      attachments: attachedFiles,
      conversationId: currentConversationId,
    });
    setInputMessage("");
    clearAttachedFiles();
  }
};
```

#### File Attachment Flow:
```typescript
// File selection triggers upload
const handleFileChange = (files: FileList | null) => {
  if (files) {
    Array.from(files).forEach(file => {
      uploadFileMutation.mutate(file);
    });
  }
};

// Upload mutation stores file and returns metadata
const uploadFileMutation = useMutation({
  mutationFn: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    return await response.json();
  },
  onSuccess: (data, file) => {
    // Add to attached files state with retention info
    const attachedFile: AttachedFile = {
      id: data.file.id,
      fileName: data.file.fileName,
      displayName: data.file.displayName,
      fileType: file.type,
      fileSize: file.size,
      retentionInfo: data.file.retentionInfo,
    };
    setAttachedFiles((prev) => [...prev, attachedFile]);
  }
});
```

### 3. Message Display System

#### Message Rendering:
```typescript
// Generate messages for display including pending messages
const messagesToDisplay = generateMessagesToDisplay(
  messages,
  pendingUserMessage,
  currentConversationId,
  welcomeMessage
);

// Render each message with ChatMessage component
messagesToDisplay?.map((message) => (
  <ChatMessage
    key={message.id}
    message={message.content}
    isUser={message.isUserMessage}
    timestamp={message.timestamp}
    attachments={message.attachments}
  />
))
```

#### Attachment Preview Display:
```typescript
// Show attached files before sending
{attachedFiles.length > 0 && (
  <div className="mb-3 flex flex-wrap gap-2">
    {attachedFiles.map((file) => (
      <div key={file.id} className="relative bg-secondary rounded-lg p-2">
        {file.fileType.startsWith("image/") ? (
          // Image preview with thumbnail
          <img
            src={`/uploads/${file.fileName}`}
            alt={file.displayName}
            className="w-full h-20 object-cover rounded"
          />
        ) : (
          // File icon for non-images
          <div className="flex items-center gap-2">
            {getFileIcon(file.fileType)}
            <span className="text-xs truncate">
              {file.displayName}
            </span>
          </div>
        )}
      </div>
    ))}
  </div>
)}
```

## Backend Processing

### 1. API Route Handling (`server/routes.ts`)

#### Message Processing Endpoint:
```typescript
app.post("/api/messages", async (req, res) => {
  const { content, conversationId, attachments } = messageSchema.parse(req.body);

  // 1. Handle conversation creation/retrieval
  if (!currentConversationId) {
    const [newConversation] = await db.insert(conversations).values({
      userId,
      title: content.slice(0, 50) + '...'
    }).returning();
    currentConversationId = newConversation.id;
  }

  // 2. Save user message with attachments
  const [savedUserMessage] = await db.insert(conversationMessages).values({
    conversationId: currentConversationId,
    role: 'user',
    content,
    metadata: attachments?.length > 0 ? { attachments } : undefined
  }).returning();

  // 3. Process with AI service
  const aiResult = await chatService.getChatResponse(
    content,
    userId,
    currentConversationId,
    messageId,
    coachingMode,
    conversationHistory,
    aiConfig,
    attachments,
    automaticModelSelection
  );

  // 4. Save AI response
  const [savedAiMessage] = await db.insert(conversationMessages).values({
    conversationId: currentConversationId,
    role: 'assistant',
    content: aiResult.response
  }).returning();
});
```

#### File Upload Endpoint:
```typescript
app.post("/api/upload", fileUpload.single('file'), async (req, res) => {
  // 1. Generate unique filename
  const fileId = nanoid();
  const fileName = `${fileId}.${fileExtension}`;

  // 2. Save to uploads directory
  writeFileSync(filePath, req.file.buffer);

  // 3. Analyze for retention categorization
  const retentionInfo = attachmentRetentionService.getRetentionInfo(
    originalFileName,
    req.file.mimetype
  );

  // 4. Return file metadata
  res.json({
    file: {
      id: fileId,
      fileName,
      displayName: originalFileName,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      retentionInfo
    }
  });
});
```

### 2. AI Service Processing (`server/services/openai-service.ts`)

#### Message Context Building:
```typescript
async getChatResponse(message, userId, conversationId, messageId, coachingMode, conversationHistory, aiConfig, attachments, automaticModelSelection) {
  // 1. Apply automatic model selection
  if (automaticModelSelection) {
    aiConfig = this.selectOptimalModel(message, attachments, aiConfig);
  }

  // 2. Process attachments for AI context
  const processedMessage = await this.processCurrentMessageWithAttachments(message, attachments);

  // 3. Build conversation context with history
  const conversationContext = [];
  conversationContext.push({
    role: 'system',
    content: this.buildSystemPrompt(coachingMode, relevantMemories)
  });

  // 4. Add historical messages with attachments
  for (const msg of conversationHistory) {
    if (msg.role === 'user') {
      const content = await this.processHistoricalAttachments(msg);
      conversationContext.push({ role: 'user', content });
    } else {
      conversationContext.push({ role: 'assistant', content: msg.content });
    }
  }

  // 5. Add current message
  conversationContext.push(processedMessage);
}
```

#### Attachment Processing for AI:
```typescript
async processCurrentMessageWithAttachments(message: string, attachments: any[] = []) {
  const content: any[] = [];

  // Add text content
  content.push({ type: "text", text: message });

  // Process each attachment
  for (const attachment of attachments) {
    if (attachment.fileType?.startsWith('image/')) {
      // Load image and convert to base64
      const imagePath = join(process.cwd(), 'uploads', attachment.fileName);
      const imageBuffer = readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Add image to AI context
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${attachment.fileType};base64,${base64Image}`,
          detail: "high"
        }
      });
    } else {
      // Add file reference for non-images
      content.push({
        type: "text",
        text: `[Attached file: ${attachment.displayName} (${attachment.fileType})]`
      });
    }
  }

  return { role: 'user', content };
}
```

## Database Storage

### 1. Schema Design (`shared/schema.ts`)

#### Conversations Table:
```typescript
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### Conversation Messages Table:
```typescript
export const conversationMessages = pgTable("conversation_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // Stores attachment info
  createdAt: timestamp("created_at").defaultNow(),
});
```

#### Attachment Metadata Storage:
```typescript
// Stored in metadata field as JSON
{
  "attachments": [
    {
      "id": "file-id",
      "fileName": "stored-filename.jpg",
      "displayName": "original-name.jpg",
      "fileType": "image/jpeg",
      "fileSize": 123456
    }
  ]
}
```

### 2. Data Retrieval

#### Conversation History Loading:
```typescript
// Fetch conversation messages with attachments
const messages = await db
  .select()
  .from(conversationMessages)
  .where(eq(conversationMessages.conversationId, conversationId))
  .orderBy(conversationMessages.createdAt);

// Transform for client consumption
return messages.map((msg) => ({
  id: msg.id,
  content: msg.content,
  isUserMessage: msg.role === "user",
  timestamp: new Date(msg.createdAt),
  attachments: msg.metadata?.attachments?.map((att) => ({
    name: att.fileName,
    type: att.fileType
  }))
}));
```

## File Storage and Management

### 1. Physical File Storage
- **Location**: `uploads/` directory
- **Naming**: Unique nanoid-generated filenames with original extensions
- **Access**: Served via `/uploads/` route in Express

### 2. Attachment Retention System (`server/services/attachment-retention-service.ts`)

#### Intelligent Categorization:
```typescript
categorizeAttachment(fileName: string, fileType: string, context?: string) {
  const lowerFileName = fileName.toLowerCase();

  // High-value: Medical documents (kept indefinitely)
  if (lowerFileName.includes('blood') || 
      lowerFileName.includes('lab') || 
      lowerFileName.includes('medical')) {
    return {
      category: 'high',
      retentionDays: -1, // Permanent
      reason: 'Medical/health document detected'
    };
  }

  // Medium-value: Health plans (90 days)
  if (lowerFileName.includes('plan') || 
      lowerFileName.includes('workout')) {
    return {
      category: 'medium',
      retentionDays: 90,
      reason: 'Health plan or routine document'
    };
  }

  // Low-value: General files (30 days)
  return {
    category: 'low',
    retentionDays: 30,
    reason: 'General file or temporary content'
  };
}
```

## Visual Display System

### 1. Message Component (`client/src/components/ui/chat-message.tsx`)

#### Message Rendering:
```typescript
export function ChatMessage({ message, isUser, timestamp, attachments }) {
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar */}
      <Avatar className="h-8 w-8">
        <AvatarImage src={isUser ? "/user-avatar.png" : "/ai-avatar.png"} />
        <AvatarFallback>{isUser ? "U" : "AI"}</AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className="space-y-2 max-w-2xl">
        <div className="bg-background border rounded-lg p-3">
          {/* Text Content */}
          <div className="text-sm">{message}</div>

          {/* Attachments Display */}
          {attachments && attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {attachments.map((attachment, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  {getFileIcon(attachment.type)}
                  <span>{attachment.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground">
          {formatTime(timestamp)}
        </div>
      </div>
    </div>
  );
}
```

### 2. File Icons and Visual Indicators

#### Dynamic Icon System:
```typescript
// client/src/utils/chatUtils.tsx
export const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
  if (fileType.startsWith('video/')) return <VideoIcon className="h-4 w-4" />;
  if (fileType.startsWith('audio/')) return <AudioIcon className="h-4 w-4" />;
  if (fileType === 'application/pdf') return <FileTextIcon className="h-4 w-4" />;
  return <FileIcon className="h-4 w-4" />;
};
```

## Context Persistence

### 1. Conversation Context Maintenance
- **Current Conversation State**: Managed by `currentConversationId` in `useChatMessages.ts`
- **Message History**: Loaded from database on conversation selection
- **Attachment Context**: Preserved in message metadata and referenced in AI context

### 2. Visual Context Persistence
- **Image Display**: Historical images loaded from uploads directory
- **File References**: Non-image attachments shown with appropriate icons
- **Context Continuity**: Users can reference previous attachments in follow-up questions

## State Management Flow

### 1. React Query Integration
```typescript
// Message fetching with caching
const { data: messages, isLoading: loadingMessages } = useQuery({
  queryKey: ["messages", currentConversationId || "new"],
  queryFn: async () => {
    if (!currentConversationId) return [welcomeMessage];

    const response = await fetch(`/api/conversations/${currentConversationId}/messages`);
    const convMessages = await response.json();

    return convMessages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      isUserMessage: msg.role === "user",
      timestamp: new Date(msg.createdAt),
      attachments: msg.metadata?.attachments
    }));
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### 2. Optimistic Updates
```typescript
// Show pending message immediately
onMutate: async ({ content, attachments }) => {
  setPendingUserMessage({
    content,
    timestamp: new Date(),
    attachments: attachments.map(f => ({ 
      name: f.fileName, 
      type: f.fileType 
    }))
  });
},

// Update cache on success
onSuccess: (data) => {
  setPendingUserMessage(null);
  queryClient.setQueryData(targetQueryKey, (old = []) => [
    ...old,
    data.userMessage,
    data.aiMessage
  ]);
}
```

## Error Handling and Edge Cases

### 1. File Upload Errors
- **Size Limits**: 50MB for general files, 25MB for audio
- **Type Restrictions**: Allowed types defined in multer configuration
- **Storage Failures**: Graceful fallback with error messages

### 2. Missing Files
- **Broken References**: Skip non-existent files with console warnings
- **Fallback Display**: Show file name with error indicator if file missing

### 3. Context Loss Prevention
- **Conversation Validation**: Check conversation existence before adding messages
- **History Reconstruction**: Rebuild context from database on page refresh
- **Attachment Persistence**: Maintain file references across sessions

## Performance Optimizations

### 1. Lazy Loading
- **Message Pagination**: Load recent messages first
- **Image Loading**: On-demand loading of historical images
- **Conversation Lists**: Limited to recent 20 conversations

### 2. Caching Strategies
- **React Query**: 5-minute stale time for message data
- **File Serving**: Static file serving with proper headers
- **Memory Management**: Efficient attachment metadata storage

## Conclusion

The chat UI system provides a comprehensive, ChatGPT-like experience with:
- **Persistent Visual Context**: Images and attachments maintained across conversation turns
- **Intelligent File Management**: Smart categorization and retention policies
- **Seamless State Management**: Optimistic updates with proper error handling
- **Multi-modal Support**: Text, images, audio, and documents
- **Performance Optimization**: Efficient loading and caching strategies

This architecture ensures users can have natural, continuous conversations with full context preservation, making the AI wellness coach experience both powerful and intuitive.
