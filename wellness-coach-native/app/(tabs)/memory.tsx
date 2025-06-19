import React, { useState, useMemo, useEffect, useCallback } from 'react'; // Added useCallback
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Button, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { PlusCircle, Search, Edit3, Trash2, Filter, AlertCircle } from 'lucide-react-native';
import { useMemoryApi, MemoryItem } from '../../../src/hooks/useMemoryApi';
import { useToast } from '../../../src/hooks/use-toast';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, LAYOUT_SPACING } from '../../../src/theme';

const MemoryScreen: React.FC = () => {
  const {
    memories,
    isLoadingMemories,
    memoriesError,
    refetchMemories,
    deleteMemoryAPI,
    isDeletingMemory
  } = useMemoryApi();
  const { show: showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (memoriesError) {
      showToast({ title: "Error Fetching Memories", message: memoriesError.message || "Could not load memories.", type: 'error' });
    }
  }, [memoriesError, showToast]);

  const handleEditMemory = useCallback((memory: MemoryItem) => {
    alert(`Editing: ${memory.content.substring(0,30)}...`);
  }, []);

  const handleDeleteMemory = useCallback((memory: MemoryItem) => {
    Alert.alert(
      "Delete Memory",
      `Are you sure you want to delete this memory?\n"${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}"`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingItemId(memory.id);
            try {
              await deleteMemoryAPI(memory.id);
              showToast({ title: "Memory Deleted", message: "The memory has been successfully deleted.", type: 'success' });
            } catch (error: any) {
              showToast({ title: "Delete Failed", message: error.message || "Could not delete memory.", type: 'error' });
            } finally {
              setDeletingItemId(null);
            }
          }
        }
      ]
    );
  }, [deleteMemoryAPI, showToast]); // Removed refetchMemories, it's handled by query invalidation

  const handleAddMemory = useCallback(() => {
    alert('Add New Memory pressed - functionality to be implemented.');
  }, []);

  const handleFilterMemories = useCallback(() => {
    alert('Filter Memories pressed - functionality to be implemented.');
  }, []);

  const filteredMemories = useMemo(() => {
    if (!searchQuery) return memories;
    return memories.filter(memory =>
        memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (memory.category && memory.category.toLowerCase().includes(searchQuery.toLowerCase()))
      );
  }, [memories, searchQuery]);

  const renderMemoryItem = useCallback(({ item }: { item: MemoryItem }) => (
    <View style={styles.memoryItemContainer}>
      <View style={styles.memoryContent}>
        <Text style={styles.memoryText}>{item.content}</Text>
        <Text style={styles.memoryMeta}>
          Category: {item.category || 'N/A'} | Importance: {item.importance || 'N/A'}
        </Text>
        <Text style={styles.memoryDate}>
          Recorded: {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'N/A'}
        </Text>
      </View>
      <View style={styles.memoryActions}>
        <TouchableOpacity onPress={() => handleEditMemory(item)} style={styles.actionButton}>
          <Edit3 size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteMemory(item)}
          style={styles.actionButton}
          disabled={deletingItemId === item.id || isDeletingMemory}
        >
          {deletingItemId === item.id ?
            <ActivityIndicator size="small" color={COLORS.error} /> :
            <Trash2 size={18} color={COLORS.error} />
          }
        </TouchableOpacity>
      </View>
    </View>
  ), [handleEditMemory, handleDeleteMemory, deletingItemId, isDeletingMemory, COLORS.primary, COLORS.error]); // Added COLORS to deps for icon colors

  if (isLoadingMemories && !memories.length) {
    return (
      <View style={styles.centeredMessageContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{marginTop: SPACING.sm, color: COLORS.textSecondary}}>Loading memories...</Text>
      </View>
    );
  }

  if (memoriesError) {
    return (
      <View style={styles.centeredMessageContainer}>
        <AlertCircle size={40} color={COLORS.error} />
        <Text style={styles.errorText}>Error fetching memories: {memoriesError.message}</Text>
        <Button title="Retry" onPress={() => refetchMemories()} color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.header}>Memories & Insights</Text>

      <View style={styles.searchFilterArea}>
        <View style={styles.searchContainer}>
          <Search size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search memories..."
            placeholderTextColor={COLORS.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={handleFilterMemories}>
          <Filter size={20} color={COLORS.white} />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredMemories}
        renderItem={renderMemoryItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
            <View style={styles.centeredMessageContainer}>
                <Text style={styles.emptyListText}>No memories found.</Text>
            </View>
        }
        contentContainerStyle={styles.listContentContainer}
        refreshControl={
          <RefreshControl refreshing={isLoadingMemories} onRefresh={refetchMemories} tintColor={COLORS.primary} />
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddMemory}>
        <PlusCircle size={28} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  header: {
    fontSize: FONT_SIZES.h2, fontWeight: FONT_WEIGHTS.bold, textAlign: 'center',
    paddingVertical: SPACING.md, backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, color: COLORS.text,
  },
  searchFilterArea: {
    flexDirection: 'row', padding: SPACING.sm, backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center',
  },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.lightGray, borderRadius: SPACING.lg, paddingHorizontal: SPACING.sm,
  },
  searchIcon: { marginRight: SPACING.sm },
  searchInput: {
    flex: 1, height: 40, fontSize: FONT_SIZES.body,
    color: COLORS.text
  },
  filterButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: SPACING.lg, marginLeft: SPACING.sm,
  },
  filterButtonText: { color: COLORS.white, fontSize: FONT_SIZES.body - 2, marginLeft: SPACING.xs, fontWeight: FONT_WEIGHTS.medium },
  listContentContainer: { paddingBottom: SPACING.xl + SPACING.lg, flexGrow: 1 },
  memoryItemContainer: {
    backgroundColor: COLORS.cardBackground, borderRadius: SPACING.sm, padding: SPACING.md,
    marginVertical: SPACING.xs, marginHorizontal: LAYOUT_SPACING.screenPaddingHorizontal,
    flexDirection: 'row', justifyContent: 'space-between',
    elevation: 1, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  memoryContent: { flex: 1 },
  memoryText: { fontSize: FONT_SIZES.body, color: COLORS.text, marginBottom: SPACING.xs },
  memoryMeta: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: SPACING.xxs },
  memoryDate: { fontSize: FONT_SIZES.caption - 1, color: COLORS.textDisabled },
  memoryActions: {
    flexDirection: 'column', justifyContent: 'space-around',
    alignItems: 'center', marginLeft: SPACING.sm,
  },
  actionButton: { padding: SPACING.xs },
  centeredMessageContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
  },
  emptyListText: { textAlign: 'center', fontSize: FONT_SIZES.body, color: COLORS.textSecondary },
  errorText: { textAlign: 'center', fontSize: FONT_SIZES.body, color: COLORS.error, marginBottom: SPACING.sm },
  fab: {
    position: 'absolute', right: SPACING.md, bottom: SPACING.md, backgroundColor: COLORS.primary,
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center',
    alignItems: 'center', elevation: 4, shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2,
  },
});

export default MemoryScreen;
