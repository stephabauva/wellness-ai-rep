import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Button, ScrollView, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { PlusCircle, Search, Edit3, Trash2, Filter, AlertCircle } from 'lucide-react-native';
import { useMemoryApi, MemoryItem } from '../../../src/hooks/useMemoryApi'; // Import the hook and type
import { useToast } from '../../../src/hooks/use-toast';

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
  // State to track which memory item's delete action is currently processing
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (memoriesError) {
      showToast({ title: "Error Fetching Memories", message: memoriesError.message || "Could not load memories.", type: 'error' });
    }
  }, [memoriesError, showToast]);


  // Placeholder actions
  const handleEditMemory = (memory: MemoryItem) => alert(`Editing: ${memory.content.substring(0,30)}...`);

  const handleDeleteMemory = (memory: MemoryItem) => {
    Alert.alert(
      "Delete Memory",
      `Are you sure you want to delete this memory?\n"${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}"`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingItemId(memory.id); // Indicate this item's delete is in progress
            try {
              await deleteMemoryAPI(memory.id);
              showToast({ title: "Memory Deleted", message: "The memory has been successfully deleted.", type: 'success' });
              // refetchMemories(); // onSuccess in useMemoryApi already invalidates query, so data will refetch.
                                // Explicit refetch might be desired for immediate UI update if not using optimistic updates.
            } catch (error: any) {
              showToast({ title: "Delete Failed", message: error.message || "Could not delete memory.", type: 'error' });
            } finally {
              setDeletingItemId(null); // Clear deleting state for this item
            }
          }
        }
      ]
    );
  };

  const handleAddMemory = () => alert('Add New Memory pressed - functionality to be implemented.');
  const handleFilterMemories = () => alert('Filter Memories pressed - functionality to be implemented.');

  const filteredMemories = useMemo(() => {
    if (!searchQuery) return memories;
    return memories.filter(memory =>
        memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (memory.category && memory.category.toLowerCase().includes(searchQuery.toLowerCase()))
      );
  }, [memories, searchQuery]);

  const renderMemoryItem = ({ item }: { item: MemoryItem }) => (
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
          <Edit3 size={18} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteMemory(item)}
          style={styles.actionButton}
          disabled={deletingItemId === item.id || isDeletingMemory} // Disable if this item is deleting or any delete is globally active
        >
          {deletingItemId === item.id ?
            <ActivityIndicator size="small" /> :
            <Trash2 size={18} color="#EF5350" />
          }
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoadingMemories && !memories.length) { // Show full screen loader only on initial load
    return (
      <View style={styles.centeredMessageContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading memories...</Text>
      </View>
    );
  }

  if (memoriesError) {
    return (
      <View style={styles.centeredMessageContainer}>
        <AlertCircle size={40} color="red" />
        <Text style={styles.errorText}>Error fetching memories: {memoriesError.message}</Text>
        <Button title="Retry" onPress={() => refetchMemories()} />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.header}>Memories & Insights</Text>

      <View style={styles.searchFilterArea}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search memories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={handleFilterMemories}>
          <Filter size={20} color="#fff" />
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
          <RefreshControl refreshing={isLoadingMemories && memories.length > 0} onRefresh={refetchMemories} />
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddMemory}>
        <PlusCircle size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#F4F6F8' },
  header: {
    fontSize: 24, fontWeight: 'bold', textAlign: 'center', paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  searchFilterArea: {
    flexDirection: 'row', padding: 10, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E0E0E0', alignItems: 'center',
  },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E9ECEF', borderRadius: 20, paddingHorizontal: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40, fontSize: 16 },
  filterButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginLeft: 10,
  },
  filterButtonText: { color: '#fff', fontSize: 14, marginLeft: 5 },
  listContentContainer: { paddingBottom: 80, flexGrow: 1 }, // Added flexGrow
  memoryItemContainer: {
    backgroundColor: '#fff', borderRadius: 8, padding: 15, marginVertical: 6,
    marginHorizontal: 10, flexDirection: 'row', justifyContent: 'space-between',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  memoryContent: { flex: 1 },
  memoryText: { fontSize: 15, color: '#333', marginBottom: 5 },
  memoryMeta: { fontSize: 12, color: '#555', fontStyle: 'italic', marginBottom: 3 },
  memoryDate: { fontSize: 11, color: '#777' },
  memoryActions: {
    flexDirection: 'column', justifyContent: 'space-around',
    alignItems: 'center', marginLeft: 10,
  },
  actionButton: { padding: 6 },
  centeredMessageContainer: { // Added for centering empty/error/loading messages
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyListText: { textAlign: 'center', fontSize: 16, color: '#777' },
  errorText: { textAlign: 'center', fontSize: 16, color: 'red', marginBottom: 10 },
  fab: {
    position: 'absolute', right: 20, bottom: 20, backgroundColor: '#007AFF',
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center',
    alignItems: 'center', elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2,
  },
});

export default MemoryScreen;
