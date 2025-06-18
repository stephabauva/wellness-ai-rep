import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, Button, FlatList,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useAppContext, Message } from '../../../src/context/AppContext'; // AppContext now provides most chat logic
import { useChatActions, UseChatActionsReturn } from '../../../src/hooks/useChatActions'; // For file handling, etc.
import { useToast } from '../../../src/hooks/use-toast'; // For user feedback
import { MaterialCommunityIcons } from '@expo/vector-icons'; // For icons

const ChatScreen: React.FC = () => {
  const {
    messages,
    currentConversationId,
    loadingMessages,
    sendMessage, // This is the core send function via AppContext
    newChat,
    selectConversation, // Available from AppContext
    isStreamingActive, // From AppContext, driven by useStreamingChat
    addOptimisticMessage, // From AppContext
  } = useAppContext();

  const [inputMessage, setInputMessage] = useState('');
  const { toast } = useToast();
  const flatListRef = useRef<FlatList>(null);

  // useChatActions primarily for its streaming capabilities and potentially file attachments later
  const chatActions = useChatActions({
    inputMessage,
    setInputMessage,
    currentConversationId,
  });

  const handleSend = () => {
    if (inputMessage.trim() === '' && (!chatActions.attachedFiles || chatActions.attachedFiles.length === 0)) {
      toast({ title: 'Empty Message', message: 'Please type a message or attach a file.', type: 'info' });
      return;
    }
    // Use the streaming send from useChatActions
    chatActions.handleSendMessage();
  };

  useEffect(() => {
    // Scroll to bottom when messages change or list first loads
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Display streaming message if active
  const displayMessages = useMemo(() => {
    if (chatActions.streamingMessage && chatActions.streamingMessage.content) {
      // Check if streaming message is already part of optimistic updates
      const optimisticExists = messages.find(m => m.id === chatActions.streamingMessage?.id);
      if (!optimisticExists) {
        return [
          ...messages,
          {
            id: chatActions.streamingMessage.id,
            content: chatActions.streamingMessage.content,
            isUserMessage: false,
            timestamp: new Date(), // Or a more accurate timestamp if available
            attachments: []
          }
        ];
      }
    }
    return messages;
  }, [messages, chatActions.streamingMessage]);


  const renderMessageItem = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageBubble,
      item.isUserMessage ? styles.userMessage : styles.aiMessage
    ]}>
      <Text style={item.isUserMessage ? styles.userMessageText : styles.aiMessageText}>
        {item.content}
      </Text>
      {/* TODO: Display attachments if any */}
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0} // Adjust as needed for header height
    >
      {loadingMessages && messages.length === 0 ? (
        <ActivityIndicator style={styles.loadingIndicator} size="large" />
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayMessages} // Use displayMessages which includes live streaming content
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messageListContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No messages yet. Start chatting!</Text>}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {chatActions.isThinking && (
        <View style={styles.thinkingIndicator}>
          <Text>AI is thinking...</Text>
          <ActivityIndicator size="small" />
        </View>
      )}

      <View style={styles.inputArea}>
        {/* TODO: Add attachment button here later */}
        {/* <TouchableOpacity onPress={() => { /* TODO: Trigger file picker /}} style={styles.attachButton}>
          <MaterialCommunityIcons name="paperclip" size={24} color="#555" />
        </TouchableOpacity> */}
        <TextInput
          style={styles.textInput}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="Type your message..."
          multiline
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton} disabled={isStreamingActive || chatActions.isThinking}>
          <MaterialCommunityIcons name="send" size={24} color={ (isStreamingActive || chatActions.isThinking) ? "#aaa" : "#fff" } />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageListContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  messageBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginVertical: 4,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#007AFF', // iOS blue
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  aiMessage: {
    backgroundColor: '#E5E5EA', // iOS gray
    alignSelf: 'flex-start',
    marginRight: 'auto',
  },
  userMessageText: {
    color: 'white',
    fontSize: 16,
  },
  aiMessageText: {
    color: 'black',
    fontSize: 16,
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120, // Allow multiple lines up to a certain height
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#007AFF',
  },
  attachButton: {
    padding: 8,
    marginRight: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#777',
  },
  thinkingIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
    backgroundColor: '#e0e0e0',
  }
});

export default ChatScreen;
