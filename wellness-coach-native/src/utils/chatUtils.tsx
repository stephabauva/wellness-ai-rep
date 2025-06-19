import React from "react";
import { Text } from 'react-native';
import {
  File,
  Image as ImageIcon, // Renamed to avoid conflict with RN Image component
  Video,
  FileText,
  AudioLines,
} from 'lucide-react-native';

/**
 * @file chatUtils.ts
 * @description Utility functions for chat UI, such as icon selection for attachments and time formatting.
 */

// TODO: RN-Adapt - Consider moving Message type to a shared types file (e.g., src/types/chat.ts or AppContext) if used across the app
/**
 * @typedef Message
 * @description Represents a chat message structure (simplified local version).
 * @property {string} id - Unique ID of the message.
 * @property {string} content - Text content of the message.
 * @property {boolean} isUserMessage - True if the message is from the user, false if from AI.
 * @property {Date} timestamp - Timestamp of the message.
 * @property {{ name: string; type: string }[]} [attachments] - Optional array of attachments.
 */
type Message = {
  id: string;
  content: string;
  isUserMessage: boolean;
  timestamp: Date;
  attachments?: { name: string; type: string }[];
};

export const getFileIcon = (fileType: string): React.ReactNode => {
  const iconSize = 16; // Standard size for these inline icons
  const iconColor = "#555"; // Default color

  if (fileType.startsWith('image/')) {
    return <ImageIcon size={iconSize} color={iconColor} />;
  }
  if (fileType.startsWith('video/')) {
    return <Video size={iconSize} color={iconColor} />;
  }
  if (fileType.startsWith('audio/')) {
    return <AudioLines size={iconSize} color={iconColor} />;
  }
  if (fileType === 'application/pdf') {
    return <FileText size={iconSize} color="red" />; // Specific color for PDF
  }
  return <File size={iconSize} color={iconColor} />;
};

/**
 * Formats a timestamp into a localized time string (e.g., "10:30 AM").
 * @param {Date | string} timestamp - The date object or ISO date string to format.
 * @returns {string} A formatted time string, or "Invalid Date" if parsing fails.
 */
export const formatTime = (timestamp: Date | string) => {
  let dateObject: Date;
  if (timestamp instanceof Date) {
    dateObject = timestamp;
  } else {
    dateObject = new Date(timestamp);
  }

  if (isNaN(dateObject.getTime())) {
    return "Invalid Date";
  }
  return dateObject.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * @namespace chatUtils
 * @description A collection of utility functions for the chat interface.
 */
const chatUtils = {
  /**
   * Returns a file type icon for message attachments.
   * @function getFileIcon
   * @memberof chatUtils
   */
  getFileIcon,
  /**
   * Formats a timestamp for display in messages.
   * @function formatTime
   * @memberof chatUtils
   */
  formatTime
};

export default chatUtils;
