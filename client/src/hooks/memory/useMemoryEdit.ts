import { useState } from "react";

export function useMemoryEdit() {
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryContent, setEditingMemoryContent] = useState<string>("");

  const handleStartEdit = (memoryId: string, currentContent: string) => {
    setEditingMemoryId(memoryId);
    setEditingMemoryContent(currentContent);
  };

  const handleCancelEdit = () => {
    setEditingMemoryId(null);
    setEditingMemoryContent("");
  };

  const handleEditingContentChange = (content: string) => {
    setEditingMemoryContent(content);
  };

  return {
    editingMemoryId,
    editingMemoryContent,
    isEditing: !!editingMemoryId,
    handleStartEdit,
    handleCancelEdit,
    handleEditingContentChange,
    setEditingMemoryId,
    setEditingMemoryContent,
  };
}