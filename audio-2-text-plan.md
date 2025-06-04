The latest version of the technical specification document, labeled **Version 1.2**, already incorporates the requirements from the initial request and the subsequent clarifications (pasting text to chat input, automatic language detection, and PWA offline support). It represents the merged and most up-to-date set of specifications.

Here is the consolidated technical specification document:

---

# Technical Specification: Audio-to-Text Feature

**Version:** 1.2 (Updated for PWA Offline Support)
**Date:** June 5, 2025
**Author:** AI Assistant
**Project:** React PWA Application - Voice Input Feature

## 1. Introduction 📜

This document outlines the technical specifications for implementing an audio-to-text feature within the existing React Progressive Web Application (PWA). The feature will allow users to input text via voice by recording audio, which will then be transcribed. The transcribed text will then be automatically pasted into the chat input field, ready for the user to review, edit, and send. Users will have the option to select their preferred transcription service from a settings menu: OpenAI Whisper (online only), Google's speech recognition service (online only), or the browser's standard Web Speech API (potential for offline support). A key requirement is to provide a functional audio-to-text capability when the PWA is operating offline, leveraging the Web Speech API where supported.

## 2. Requirements

### 2.1. Functional Requirements

* **FR1:** Users must be able to initiate audio recording via a microphone button in the UI, both online and offline (if an offline provider is available and configured).
* **FR2:** Users must be able to stop audio recording.
* **FR3:** Upon stopping the recording, the captured audio must be processed and transcribed into text.
* **FR4:** The transcribed text must be automatically pasted into the active chat input field. Users must be able to edit this text before sending.
* **FR5:** Users must be able to select their preferred audio-to-text provider through a settings interface. Provider availability may change based on online/offline status.
* **FR6:** The application must store and utilize the user's selected provider for transcription.
* **FR7:** The system must handle microphone permissions gracefully.
* **FR8:** Basic error handling for transcription failures or unavailability of service must be implemented, including specific feedback for offline scenarios.
* **FR9:** The selected transcription provider should automatically detect the language of the spoken audio whenever supported. This capability may be limited or vary for offline scenarios.
* **FR10:** The audio-to-text feature must provide a functional transcription option when the PWA is operating offline, primarily relying on the Web Speech API if supported by the browser for offline use.
* **FR11:** The UI must clearly indicate which transcription providers require an internet connection and which may work offline. Provider selection should adapt to the current network status.

### 2.2. Non-Functional Requirements

* **NFR1:** **Performance:** Transcription latency should be minimized as much as possible for a good user experience.
    * Web Speech API: Real-time or near real-time.
    * OpenAI Whisper/Google: Latency will depend on audio file size, network speed, and API response times. Aim for processing within a few seconds for typical utterance lengths (e.g., up to 30 seconds).
* **NFR2:** **Accuracy:** The system should aim for the highest possible accuracy offered by the selected provider, including accurate automatic language detection (with the understanding that offline accuracy might be lower).
* **NFR3:** **Usability:** The interface for recording and selecting providers should be intuitive and easy to use. The process of transcription appearing in the chat input should feel seamless. Clear indication of online/offline feature status is important.
* **NFR4:** **Security:** API keys for OpenAI and Google services must be handled securely. They should not be exposed on the client-side.
* **NFR5:** **Privacy:** Users should be informed if their audio data is being sent to third-party servers (OpenAI, Google).
* **NFR6:** **Browser Compatibility:**
    * Web Speech API: Primarily Chrome, Edge, Safari (with varying degrees of support). Graceful degradation for unsupported browsers. Specific attention to Web Speech API offline support.
    * OpenAI Whisper/Google: Should work on all modern browsers that support `MediaRecorder` API.
* **NFR7:** **Offline Capability:** The application must default to or enable an offline-capable transcription method (Web Speech API) when the device is offline. Online-only services (OpenAI, Google) must be gracefully disabled or hidden.
* **NFR8:** **Resource Usage:** Offline models for Web Speech API, if used, should not excessively consume device resources. (Managed by browser).

---

## 3. Architecture Design 🏗️

### 3.1. High-Level Architecture

The architecture includes frontend components, an optional backend proxy for online services, and relies on PWA service workers for offline caching and network status detection.

```mermaid
graph TD
    UserInterface[React Frontend: Chat Input, Mic Button] -- Interacts with --> AudioRecordingService[Audio Recording Service (MediaRecorder)]
    UserInterface -- Manages Settings & Online Status --> SettingsState[Settings State (Provider Choice, isOnline)]
    PWAServiceWorker[PWA Service Worker] -- Manages --> AppCache[App Shell Cache]
    PWAServiceWorker -- Detects --> NetworkStatus[Network Status]
    NetworkStatus -- informs --> SettingsState

    AudioRecordingService -- Audio Blob --> ProcessingLogic{Audio Processing Logic}

    ProcessingLogic -- Checks isOnline & Provider --> RouteLogic{Routing Logic}

    RouteLogic -- If Web Speech API (Online/Offline) --> WebSpeechAPI[Browser Web Speech API]
    WebSpeechAPI -- Transcribed Text --> ChatInputUpdate[Updates Chat Input State]

    RouteLogic -- If OpenAI Whisper (Online Only) --> BackendProxyOpenAI[Backend Proxy (for OpenAI)]
    BackendProxyOpenAI -- Audio Blob & API Key --> OpenAIWhisperAPI[OpenAI Whisper API]
    OpenAIWhisperAPI -- Transcribed Text --> BackendProxyOpenAI
    BackendProxyOpenAI -- Transcribed Text --> ChatInputUpdate

    RouteLogic -- If Google (Online Only) --> BackendProxyGoogle[Backend Proxy (for Google)]
    BackendProxyGoogle -- Audio Blob & API Key --> GoogleSpeechAPI[Google Speech-to-Text API / Gemini Static Audio]
    GoogleSpeechAPI -- Transcribed Text --> BackendProxyGoogle
    BackendProxyGoogle -- Transcribed Text --> ChatInputUpdate

    ChatInputUpdate -- Pastes text into --> UserInterface
```

### 3.2. Component Breakdown

* **Frontend (React App):**
    * `AudioRecorderButton`: UI component to start/stop recording.
    * `ChatInput`: Existing chat input component where transcribed text will be placed.
    * `SettingsPanel`: UI component to select the transcription provider.
    * `AudioService`: Module responsible for:
        * Handling microphone permissions.
        * Recording audio using `MediaRecorder`.
        * Interfacing with the selected transcription provider.
    * `SettingsService`: Module for managing and persisting user's provider choice.
    * `ChatStateService`: (Or existing state management for chat) Manages the value of the chat input field.
    * `NetworkStatusService` (or integrated logic): Monitors `navigator.onLine` and potentially service worker messages to determine online/offline status.
* **Backend Proxy (Node.js/Express.js or similar - Optional but Recommended for online services):**
    * `/api/transcribe/openai`: Endpoint for OpenAI Whisper.
    * `/api/transcribe/google`: Endpoint for Google Speech-to-Text.
* **PWA Service Worker:**
    * Caches application shell and static assets for offline availability.
    * Can assist in more robust online/offline detection.

### 3.3. Data Flow

1.  **User selects a provider** in the SettingsPanel. Preference is saved. Online/Offline status affects available choices.
2.  **User clicks the microphone button.**
3.  **Frontend requests microphone permission.**
4.  If granted, **audio recording starts** (using `MediaRecorder` for blob-based providers or directly by Web Speech API).
5.  **User clicks the stop button** (or speech ends for Web Speech API).
6.  `MediaRecorder` produces an **audio blob** (for OpenAI/Google).
7.  Based on `isOnline` status and selected provider:
    * **If Offline:**
        1.  The application attempts to use the **Web Speech API**.
        2.  If Web Speech API supports offline recognition on the current browser/OS and has necessary language models, it processes audio.
        3.  Transcribed text received via API events.
        4.  If Web Speech API offline is not available/functional, the user is informed.
    * **If Online:**
        * **Web Speech API:** Uses browser's standard implementation (often network-connected for best results).
        * **OpenAI Whisper / Google:** The audio blob is sent to the **Backend Proxy**. The proxy forwards it to the respective third-party API. Transcribed text is returned to the frontend.
8.  **Frontend pastes the transcribed text into the chat input field's state**, making it visible and editable by the user.

---

## 4. Detailed Design - Frontend (React App) ⚛️

### 4.1. UI/UX Considerations

* **Microphone Button:** Clear visual states (idle, recording, processing).
* **Chat Input:** Transcribed text seamlessly appears. Cursor ideally at the end of inserted text.
* **Permissions:** Smooth handling of permission requests/denials.
* **Error Messages:** User-friendly messages for all scenarios, including offline limitations.
* **Settings:** Easy-to-access provider selection.
* **Online/Offline Indication:**
    * Global UI element indicating network status (optional).
    * In settings, clearly mark "OpenAI Whisper (Online Only)" and "Google (Online Only)".
    * When offline, disable/deemphasize online-only options. "Browser Default (Web Speech API)" should be highlighted or auto-selected if available for offline use.
* **Fallback Behavior**: If offline and Web Speech API fails or is unsupported, provide clear feedback.

### 4.2. State Management (e.g., Zustand, Redux, or React Context)

* `isRecording`: boolean
* `isTranscribing`: boolean
* `chatInputValue`: string (This state will be updated with the transcribed text)
* `selectedProvider`: 'openai' | 'google' | 'webSpeech'
* `error`: string | null
* `micPermission`: 'granted' | 'denied' | 'prompt'
* `isOnline`: boolean (Managed by `NetworkStatusService` or equivalent logic)

### 4.3. Audio Recording

Use the `MediaRecorder` API for OpenAI and Google providers. Web Speech API typically handles its own audio capture.

```javascript
// Example snippet for AudioService (for blob-based providers)
let mediaRecorder;
let audioChunks = [];

const startRecordingForBlob = async (setChatInputCallback) => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('MediaDevices API not supported.');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream); // Consider appropriate mimeType
  audioChunks = [];

  mediaRecorder.ondataavailable = event => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/wav' });
    processAudioBlob(audioBlob, setChatInputCallback); // New function for blob processing
    audioChunks = [];
    stream.getTracks().forEach(track => track.stop());
  };

  mediaRecorder.start();
  // Update state: isRecording = true
};

const stopRecordingForBlob = () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    // Update state: isRecording = false, isTranscribing = true
  }
};
```

### 4.4. API Interaction Logic

```javascript
// In AudioService or similar

// Function to handle processing of recorded audio blobs (for OpenAI/Google)
const processAudioBlob = async (audioBlob, setChatInputValue) => {
  const provider = /* get selectedProvider from state */;
  const isOnline = /* get isOnline from state */;
  // Update state: isTranscribing = true, error = null

  if (!isOnline) {
    // Update state: error = `${provider} requires an internet connection.`, isTranscribing = false
    setChatInputValue(''); // Or provide specific error feedback
    return;
  }

  try {
    let text = '';
    if (provider === 'openai') {
      text = await transcribeWithOpenAI(audioBlob);
    } else if (provider === 'google') {
      text = await transcribeWithGoogle(audioBlob);
    } else {
      throw new Error('Invalid provider for blob processing.');
    }
    setChatInputValue(text);
    // Update state: isTranscribing = false
  } catch (err) {
    // Update state: error = err.message, isTranscribing = false
    setChatInputValue('');
  }
};

// For OpenAI and Google, these functions make fetch requests to your backend proxy
const transcribeWithOpenAI = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav'); // Ensure filename/type as API expects
  const response = await fetch('/api/transcribe/openai', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ message: 'OpenAI transcription failed with non-JSON response' }));
    throw new Error(errData.message || 'OpenAI transcription failed');
  }
  const data = await response.json();
  return data.transcription;
};

const transcribeWithGoogle = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');
  const response = await fetch('/api/transcribe/google', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ message: 'Google transcription failed with non-JSON response' }));
    throw new Error(errData.message || 'Google transcription failed');
  }
  const data = await response.json();
  return data.transcription;
};

// Web Speech API has its own flow (see section 6.3)
```

---

## 5. Detailed Design - Backend Proxy (Recommended for Online Services) ⚙️

* **Technology Stack:** Node.js with Express.js (or any other preferred backend framework).
* **Endpoints:**
    * **POST `/api/transcribe/openai`**
        * Accepts: `multipart/form-data` with an audio file.
        * Action: Securely forwards to OpenAI Whisper API with API key. Returns transcription or error.
    * **POST `/api/transcribe/google`**
        * Accepts: `multipart/form-data` with an audio file.
        * Action: Securely forwards to Google Cloud Speech-to-Text API (or Gemini static audio) with API key. Returns transcription or error.
* **API Key Management:** API keys stored securely on the backend (e.g., environment variables). Not exposed to client.
* **CORS:** Configure if backend is on a different domain.

---

## 6. Provider-Specific Implementation Details 🎙️

### 6.1. OpenAI Whisper

* **Offline Support: No.** Clearly mark as "Online Only".
* **API Endpoint (via Backend Proxy)**: `POST /api/transcribe/openai`
* **Server-Side Request to OpenAI**:
    * URL: `https://api.openai.com/v1/audio/transcriptions`
    * Method: `POST`
    * Headers: `Authorization: Bearer $OPENAI_API_KEY`, `Content-Type: multipart/form-data`
    * Body: `FormData` with `file` (audio), `model` ("whisper-1").
    * **Language Detection**: Omit `language` parameter for automatic detection.
* **Response Format (from OpenAI, then proxied)**: JSON `{ "text": "..." }`
* **Error Handling**: Handle API errors from OpenAI via proxy.

### 6.2. Google (Cloud Speech-to-Text / Gemini Static Audio)

* **Offline Support: No.** Clearly mark as "Online Only".
* **API Endpoint (via Backend Proxy)**: `POST /api/transcribe/google`
* **Server-Side Request to Google Cloud Speech-to-Text (example v1)**:
    * URL: `https://speech.googleapis.com/v1/speech:recognize?key=YOUR_GOOGLE_API_KEY`
    * Method: `POST`
    * Headers: `Content-Type: application/json`
    * Body: JSON payload
        ```json
        {
          "config": {
            "encoding": "LINEAR16", // Or other, match audio blob (e.g., WEBM_OPUS from MediaRecorder)
            "sampleRateHertz": 16000, // Or actual sample rate
            // For automatic language detection:
            // Omit 'languageCode'. Optionally provide 'alternativeLanguageCodes': ["en-US", "es-ES"].
            // Refer to Google Cloud Speech-to-Text docs for latest on language ID.
          },
          "audio": {
            "content": "BASE64_ENCODED_AUDIO_STRING" // Backend converts blob to base64
          }
        }
        ```
* **Response Format (from Google, then proxied)**: JSON with `results[0].alternatives[0].transcript`.
* **Error Handling**: Handle API errors from Google via proxy.

### 6.3. Standard Web Tool (Web Speech API)

* **Offline Support: Potential (Browser/OS Dependent).** This is the primary candidate for offline functionality.
    * Offline recognition relies on browser-managed language models.
    * **Language Detection Offline**: May be limited or default to a single language. Omitting `recognition.lang` is the standard way to attempt auto-detection, but reliability varies.
    * **Accuracy Offline**: Generally lower than online.
* **Implementation (Directly in frontend `AudioService`):**
    ```javascript
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    // let currentSetChatInputValueCallback; // To hold the latest callback

    const initializeWebSpeech = (setChatInputCb) => {
      // currentSetChatInputValueCallback = setChatInputCb;
      if (!SpeechRecognition) {
        console.warn('Web Speech API not supported.');
        // Update state: error = "Web Speech API not supported on this browser."
        // Disable Web Speech API option in settings.
        return false;
      }
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      // For auto language detection, do not set recognition.lang.
      // recognition.lang = 'en-US'; // Only for specific language targeting.

      recognition.onstart = () => {
        // Update state: isRecording = true (or specific to Web Speech)
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        // Update UI with interimTranscript if needed
        if (finalTranscript && currentSetChatInputValueCallback) {
          currentSetChatInputValueCallback(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Web Speech API Error:', event.error);
        // Update state: error = `Web Speech Error: ${event.error}`
        // Inform user, especially for 'not-allowed', 'no-speech', 'network', 'service-not-allowed' (critical for offline)
      };

      recognition.onend = () => {
        // Update state: isRecording = false (or specific to Web Speech)
      };
      return true;
    };

    // Called when user wants to start recording with Web Speech API
    const startWebSpeechRecognition = (setChatInputCb) => {
      currentSetChatInputValueCallback = setChatInputCb; // Store/update the callback
      if (!recognition) {
        if (!initializeWebSpeech(setChatInputCb)) return; // Failed to init
      }
      // Or if already initialized, ensure the callback is current.

      if (recognition && typeof recognition.start === 'function') {
        try {
          recognition.start();
        } catch (e) {
          console.error("Error starting Web Speech recognition:", e);
          // Handle if already started, etc.
        }
      }
    };

    const stopWebSpeechRecognition = () => {
      if (recognition && typeof recognition.stop === 'function') {
        try {
          recognition.stop();
        } catch (e) {
          console.error("Error stopping Web Speech recognition:", e);
        }
      }
    };
    ```
* **Usage Flow**: When Web Speech API is selected, pressing the "record" button directly calls `startWebSpeechRecognition()`. The `MediaRecorder` blob pathway is skipped. The UI should adapt (e.g., button text "Listening...").

---

## 7. Settings / Configuration ⚙️

* **Storage**: User's provider preference in `localStorage`.
* **UI**: Dropdown or radio group.
    * Options: "OpenAI Whisper (Online Only)", "Google (Online Only)", "Browser Default (Web Speech API)".
* **Dynamic Availability**:
    * When `isOnline` is false:
        * Disable/gray out "OpenAI Whisper" and "Google".
        * If "Browser Default (Web Speech API)" is selected, indicate its functionality relies on browser's offline capabilities.
        * If current preference is an online provider and app goes offline, auto-switch to Web Speech API if available, or disable feature with notice.
* **Default**:
    * Online: User preference or a sensible default (e.g., Web Speech API for no cost, or highest quality if keys configured).
    * Offline: "Browser Default (Web Speech API)" if supported. Otherwise, the feature is disabled.

---

## 8. Error Handling and Edge Cases ⚠️

* **Microphone Access Denied/Unavailable**: Inform user, disable mic button.
* **Network Errors (OpenAI/Google)**: Inform user.
* **API Errors (OpenAI/Google)**: Relay meaningful errors from proxy if possible.
* **Web Speech API Errors**: Handle `no-speech`, `audio-capture`, `not-allowed`, `network`, `service-not-allowed` (especially for offline).
* **Empty/Short Audio**: Graceful handling.
* **Unsupported Audio Format (Backend)**: Ensure backend handles client audio format or converts.
* **Offline - Web Speech API Unavailable/Fails**:
    * If `SpeechRecognition` object unavailable.
    * If browser lacks offline models for the (auto-detected or default) language.
    * Provide clear user feedback: "Offline transcription not available on this device/browser."
* **Transitioning Online/Offline**: Cancel ongoing online operations if connection drops. Re-evaluate provider availability.

---

## 9. PWA and Offline Considerations 📱

### 9.1. Service Worker

* **Caching**: Essential for app shell, UI, and client-side logic for offline access.
* **Network Status Detection**:
    * Use `navigator.onLine`.
    * Listen to `online` and `offline` window events.
    * Service worker can implement advanced strategies (e.g., fetch with timeout then cache fallback).

### 9.2. Feature Availability Logic

* Centralized `isOnline` state.
* Components adapt to `isOnline` status (e.g., settings panel).
* Gracefully handle ongoing operations during network status changes.

### 9.3. Web Speech API Offline Behavior

* **Thorough Testing**: Crucial on target PWA platforms (Android, iOS, desktop browsers) to understand actual offline capabilities, supported languages, and accuracy.
* **User Guidance**: If browser-specific steps are needed for offline language packs, consider providing hints (though this is out of app's direct control).

---

## 10. Security Considerations 🔒

* **API Key Management**: Backend proxy is vital for OpenAI/Google keys.
* **Data Privacy**: Inform users about data transfer to third-party servers for online services. For Web Speech API, clarify if processing is local or via browser vendor's servers (varies).
* **Input Validation (Backend)**: Validate audio files (size, type).
* **HTTPS**: For all communications.
* **Client-Side Integrity**: For offline (Web Speech API), the trust relies on client-side code and browser's implementation.

---


