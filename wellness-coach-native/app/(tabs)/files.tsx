import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Button, Alert,
  ActivityIndicator, RefreshControl, ScrollView, Platform, Modal, Image
} from 'react-native';
import { DocumentText, Trash, Eye, UploadCloud, Folder, AlertCircle, XSquare } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useFileApi } from '../../../src/hooks/useFileApi';
import { useFileUpload } from '../../../src/hooks/useFileUpload';
import { useToast } from '../../../src/hooks/use-toast';
import { FileItem as ApiFileItem } from '../../../src/types/fileManager';
import { formatFileSize, formatDate, getIconFromName, getFileIcon as getFileTypeSpecificIcon } from '../../../src/utils/fileManagerUtils';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, LAYOUT_SPACING } from '../../../src/theme'; // Import theme constants

const FilesScreen: React.FC = () => {
  const {
    files: apiFiles,
    isLoadingFiles,
    filesError,
    refetchFiles,
    deleteFiles,
    isDeletingFiles,
    categories: apiCategories,
    isLoadingCategories
  } = useFileApi();

  const { uploadFile, isUploading: isUploadingFile, error: uploadError } = useFileUpload();
  const { show: showToast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isActuallyUploading, setIsActuallyUploading] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (uploadError) {
      showToast({ title: "Upload Failed", message: uploadError, type: 'error' });
      setIsActuallyUploading(false);
    }
  }, [uploadError, showToast]);

  useEffect(() => {
    if (filesError) {
      showToast({ title: "Error Fetching Files", message: (filesError as Error).message || "Could not load files.", type: 'error' });
    }
  }, [filesError, showToast]);

  const handleDeleteFile = (file: ApiFileItem) => {
    Alert.alert(
      "Delete File",
      `Are you sure you want to delete "${file.displayName || file.fileName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFiles([file.id], {
                onSuccess: () => {
                  showToast({ title: "File Deleted", message: `${file.displayName || file.fileName} has been deleted.`, type: 'success' });
                  refetchFiles();
                },
                onError: (error: any) => {
                  showToast({ title: "Delete Failed", message: error.message || "Could not delete file.", type: 'error' });
                }
              });
            } catch (error: any) {
              showToast({ title: "Delete Error", message: error.message || "An unexpected error occurred.", type: 'error' });
            }
          }
        }
      ]
    );
  };

  const handleViewFile = (file: ApiFileItem) => {
    const fileType = file.fileType.toLowerCase();
    if (fileType.startsWith('image/') && file.url) {
      setPreviewImageUri(file.url);
      setIsPreviewModalVisible(true);
    } else {
      alert(`Viewing details for ${file.displayName || file.fileName}. URL: ${file.url || 'N/A'}`);
    }
  };

  const handleUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileToUpload = {
          uri: asset.uri, name: asset.name,
          type: asset.mimeType || '*/*', size: asset.size
        };
        setIsActuallyUploading(true);
        showToast({ title: "Uploading...", message: `Uploading ${asset.name}`, type: 'info' });
        const uploadResponse = await uploadFile(fileToUpload as any);
        if (uploadResponse && uploadResponse.success) {
          showToast({ title: "Upload Successful", message: `${asset.name} has been uploaded.`, type: 'success' });
          refetchFiles();
        } else if (!uploadError) {
          showToast({ title: "Upload Failed", message: "Could not upload file.", type: 'error' });
        }
        setIsActuallyUploading(false);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      showToast({ title: "Upload Error", message: error.message || "An error occurred during file selection.", type: 'error' });
      setIsActuallyUploading(false);
    }
  };

  const handleFilterByCategory = (categoryId: string) => setSelectedCategory(categoryId);

  const filteredFiles = useMemo(() => {
    if (selectedCategory === 'all') return apiFiles;
    if (selectedCategory === 'uncategorized') return apiFiles.filter(file => !file.categoryId);
    return apiFiles.filter(file => file.categoryId === selectedCategory);
  }, [apiFiles, selectedCategory]);

  const displayCategories = useMemo(() => {
    if (isLoadingCategories) return [{ id: 'loading', name: 'Loading cats...' } as any];
    const allCatsRaw = apiCategories || [];
    return [{ id: 'all', name: 'All Files', createdAt: '', isCustom: false } , ...allCatsRaw];
  }, [apiCategories, isLoadingCategories]);

  const renderFileIcon = (item: ApiFileItem) => {
    if (item.categoryIcon && item.categoryIcon !== 'folder') return getIconFromName(item.categoryIcon);
    return getFileTypeSpecificIcon(item.fileType, item.fileName);
  };

  const renderFileItem = ({ item }: { item: ApiFileItem }) => (
    <TouchableOpacity onPress={() => handleViewFile(item)}>
      <View style={styles.fileItemContainer}>
        <View style={styles.fileIconContainer}>{renderFileIcon(item)}</View>
        <View style={styles.fileInfoContainer}>
          <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">{item.displayName || item.fileName}</Text>
          <Text style={styles.fileMeta}>{formatFileSize(item.fileSize)} - {formatDate(item.uploadDate)}</Text>
          {item.categoryName && <Text style={styles.fileCategoryName}>{item.categoryName}</Text>}
        </View>
        <View style={styles.fileActionsContainer}>
          <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeleteFile(item); }} style={styles.actionButton} disabled={isDeletingFiles || isActuallyUploading} >
            {isDeletingFiles ? <ActivityIndicator size="small" color={COLORS.error} /> : <Trash size={20} color={COLORS.error} />}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (filesError) {
    return (
      <View style={styles.centeredMessageContainer}>
        <AlertCircle size={40} color={COLORS.error} />
        <Text style={styles.errorText}>Error fetching files: {(filesError as Error).message}</Text>
        <Button title="Retry" onPress={() => refetchFiles()} color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.header}>My Files</Text>
      <View style={styles.categoryFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollContent}>
          {displayCategories.map(category => (
            <TouchableOpacity key={category.id} style={[styles.categoryButton, selectedCategory === category.id && styles.categoryButtonSelected]} onPress={() => handleFilterByCategory(category.id)} disabled={isLoadingCategories}>
              {isLoadingCategories && category.id === 'loading' ? <ActivityIndicator size="small" color={selectedCategory === category.id ? COLORS.white : COLORS.textSecondary} /> : <Folder size={16} color={selectedCategory === category.id ? COLORS.white : (category.color || COLORS.textSecondary)} style={{marginRight: SPACING.xs}} />}
              <Text style={[styles.categoryButtonText, selectedCategory === category.id && styles.categoryButtonTextSelected]}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {isLoadingFiles && !apiFiles?.length ? (
        <View style={styles.centeredMessageContainer}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={{marginTop: SPACING.sm, color: COLORS.textSecondary}}>Loading files...</Text></View>
      ) : (
        <FlatList data={filteredFiles} renderItem={renderFileItem} keyExtractor={item => item.id}
          ListEmptyComponent={<View style={styles.centeredMessageContainer}><Text style={styles.emptyListText}>No files found for "{displayCategories.find(c=>c.id === selectedCategory)?.name || selectedCategory}" category.</Text></View>}
          contentContainerStyle={styles.listContentContainer}
          refreshControl={<RefreshControl refreshing={isLoadingFiles && (apiFiles?.length > 0)} onRefresh={refetchFiles} tintColor={COLORS.primary} />}
        />
      )}
      <TouchableOpacity style={[styles.uploadButton, (isActuallyUploading || isUploadingFile) && styles.uploadButtonDisabled]} onPress={handleUploadFile} disabled={isActuallyUploading || isUploadingFile}>
        {(isActuallyUploading || isUploadingFile) ? <ActivityIndicator size="small" color={COLORS.white} style={{marginRight: SPACING.sm}}/> : <UploadCloud size={22} color={COLORS.white} style={{marginRight: SPACING.sm}} />}
        <Text style={styles.uploadButtonText}>{(isActuallyUploading || isUploadingFile) ? 'Uploading...' : 'Upload New File'}</Text>
      </TouchableOpacity>
      <Modal animationType="slide" transparent={true} visible={isPreviewModalVisible} onRequestClose={() => setIsPreviewModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}><Image source={{ uri: previewImageUri }} style={styles.previewImage} resizeMode="contain" />
            <TouchableOpacity style={styles.closeButton} onPress={() => setIsPreviewModalVisible(false)}><XSquare size={30} color={COLORS.white} /></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  header: { fontSize: FONT_SIZES.h2, fontWeight: FONT_WEIGHTS.bold, textAlign: 'center', paddingVertical: SPACING.md, backgroundColor: COLORS.cardBackground, borderBottomWidth: 1, borderBottomColor: COLORS.border, color: COLORS.text },
  categoryFilterContainer: { paddingVertical: SPACING.sm, paddingHorizontal: LAYOUT_SPACING.screenPaddingHorizontal, backgroundColor: COLORS.cardBackground, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  categoryScrollContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs },
  categoryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: SPACING.lg, marginRight: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  categoryButtonSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryButtonText: { fontSize: FONT_SIZES.body - 2, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.medium },
  categoryButtonTextSelected: { color: COLORS.textOnPrimary, fontWeight: FONT_WEIGHTS.medium },
  listContentContainer: { paddingBottom: SPACING.md, flexGrow: 1 },
  fileItemContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBackground, padding: LAYOUT_SPACING.itemPaddingVertical, marginHorizontal: LAYOUT_SPACING.screenPaddingHorizontal, marginVertical: SPACING.xs, borderRadius: SPACING.sm, elevation: 1, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  fileIconContainer: { marginRight: SPACING.md, padding: SPACING.sm, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fileInfoContainer: { flex: 1 },
  fileName: { fontSize: FONT_SIZES.body, fontWeight: FONT_WEIGHTS.medium, color: COLORS.text },
  fileMeta: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, marginTop: SPACING.xs },
  fileCategoryName: { fontSize: FONT_SIZES.caption - 1, color: COLORS.primary, fontStyle: 'italic', marginTop: SPACING.xs },
  fileActionsContainer: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { padding: SPACING.sm, marginLeft: SPACING.sm },
  centeredMessageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  emptyListText: { textAlign: 'center', fontSize: FONT_SIZES.body, color: COLORS.textSecondary },
  errorText: { textAlign: 'center', fontSize: FONT_SIZES.body, color: COLORS.error, marginBottom: SPACING.sm },
  uploadButton: { flexDirection: 'row', backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, margin: LAYOUT_SPACING.screenPaddingHorizontal, borderRadius: SPACING.sm, elevation: 2 },
  uploadButtonDisabled: { backgroundColor: COLORS.mediumGray },
  uploadButtonText: { color: COLORS.textOnPrimary, fontSize: FONT_SIZES.body, fontWeight: FONT_WEIGHTS.medium },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)' },
  modalContent: { width: '90%', height: '80%', backgroundColor: COLORS.black, borderRadius: SPACING.md, padding: SPACING.sm, alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '100%' },
  closeButton: { position: 'absolute', top: SPACING.md, right: SPACING.md, padding: SPACING.sm },
});

export default FilesScreen;
