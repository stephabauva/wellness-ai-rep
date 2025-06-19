import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'; // Added useMemo
import {
  View, Text, StyleSheet, TextInput, /*Button,*/ FlatList, // Button removed
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useAppContext, Message } from '../../../src/context/AppContext';
import { useChatActions } from '../../../src/hooks/useChatActions';
import { useToast } from '../../../src/hooks/use-toast';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, LAYOUT_SPACING } from '../../../src/theme';

const ChatScreen: React.FC = () => {
  const {
    messages, currentConversationId, loadingMessages,
    isStreamingActive,
  } = useAppContext();

  const [inputMessage, setInputMessage] = useState('');
  const { toast } = useToast();
  const flatListRef = useRef<FlatList<Message>>(null); // Typed FlatList ref

  const chatActions = useChatActions({
    inputMessage,
    setInputMessage,
    currentConversationId,
  });

  const handleSend = useCallback(() => {
    if (inputMessage.trim() === '' && (!chatActions.attachedFiles || chatActions.attachedFiles.length === 0)) {
      toast({ title: 'Empty Message', message: 'Please type a message or attach a file.', type: 'info' });
      return;
    }
    chatActions.handleSendMessage();
  }, [inputMessage, chatActions]); // chatActions should be stable if memoized correctly in its definition

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const displayMessages = useMemo(() => {
    let currentMessages = messages;
    if (chatActions.streamingMessage && chatActions.streamingMessage.content) {
      const optimisticExists = messages.find(m => m.id === chatActions.streamingMessage?.id);
      if (!optimisticExists) {
        currentMessages = [
          ...messages,
          {
            id: chatActions.streamingMessage.id,
            content: chatActions.streamingMessage.content,
            isUserMessage: false,
            timestamp: new Date(),
            attachments: []
          }
        ];
      }
      // If optimisticExists, it means AppContext has already incorporated the streaming update
    }
    return currentMessages;
  }, [messages, chatActions.streamingMessage]);

  const renderMessageItem = useCallback(({ item }: { item: Message }) => (
    <View style={[
      styles.messageBubble,
      item.isUserMessage ? styles.userMessage : styles.aiMessage
    ]}>
      <Text style={item.isUserMessage ? styles.userMessageText : styles.aiMessageText}>
        {item.content}
      </Text>
      {/* TODO: Display attachments if any */}
      <Text style={[
        styles.timestamp,
        item.isUserMessage ? styles.userTimestamp : styles.aiTimestamp
      ]}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  ), []); // No external dependencies from ChatScreen that change

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? (LAYOUT_SPACING.headerPaddingVertical + SPACING.lg + SPACING.md) : 0} // More precise offset
    >
      {loadingMessages && displayMessages.length === 0 ? ( // Show loader only if no messages at all
        <ActivityIndicator style={styles.loadingIndicator} size="large" color={COLORS.primary} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messageListContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No messages yet. Start chatting!</Text>}
          // onLayout and onContentSizeChange for scrollToEnd can sometimes cause issues,
          // often useEffect on messages length is enough. Keeping them for now.
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {chatActions.isThinking && (
        <View style={styles.thinkingIndicator}>
          <Text style={styles.thinkingText}>AI is thinking...</Text>
          <ActivityIndicator size="small" color={COLORS.textSecondary} />
        </View>
      )}

      <View style={styles.inputArea}>
        {/* <TouchableOpacity onPress={() => {}} style={styles.attachButton}>
          <MaterialCommunityIcons name="paperclip" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity> */}
        <TextInput
          style={styles.textInput}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="Type your message..."
          placeholderTextColor={COLORS.textDisabled}
          multiline
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton} disabled={isStreamingActive || chatActions.isThinking}>
          <MaterialCommunityIcons name="send" size={24} color={ (isStreamingActive || chatActions.isThinking) ? COLORS.mediumGray : COLORS.white } />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageListContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  messageBubble: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 18, // More pronounced rounding
    marginVertical: SPACING.xs,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  aiMessage: {
    backgroundColor: COLORS.lightGray,
    alignSelf: 'flex-start',
    marginRight: 'auto',
  },
  userMessageText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.body,
  },
  aiMessageText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.body,
  },
  timestamp: {
    fontSize: FONT_SIZES.small,
    marginTop: SPACING.xs,
  },
  userTimestamp: {
    color: COLORS.white + '99', // White with opacity
    alignSelf: 'flex-end',
  },
  aiTimestamp: {
    color: COLORS.textDisabled,
    alignSelf: 'flex-end',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: COLORS.lightGray, // Themed input background
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs, // Adjust padding for platform
    fontSize: FONT_SIZES.body,
    marginRight: SPACING.sm,
    color: COLORS.text,
  },
  sendButton: {
    padding: SPACING.sm,
    borderRadius: SPACING.lg, // Fully rounded
    backgroundColor: COLORS.primary,
  },
  attachButton: { // Style for future attachment button
    padding: SPACING.sm,
    marginRight: SPACING.xs,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
  },
  thinkingIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xs,
    backgroundColor: COLORS.lightGray,
  },
  thinkingText: {
    marginRight: SPACING.sm,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
  }
});

export default ChatScreen;
