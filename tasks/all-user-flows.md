Existing pages : chat, health dashboard, memory, file manager, settings

What the user must be able to do :

# Chat page 
dependencies : memory, file manager, settings

## sending messages without attachments
The user types a text in the input field, the user presses the 'send' icon, the message is displayed in the chat and it sent to the ai coach. The ai's provider and model can be modified in Settings (Google or OpenAI).

## ai responses
After the user sends his message, an indicator with 3 dots is visible, indicating the ai is thinking.

## ai behavior
The user's primary goal and other parameters can be set in the settings.
Notes :
-Primary goal is fully implemented via getCoachingPersona() in ChatContextService.
-Coach Style & Focus Areas - not yet integrated into chat context.
-Coach Communication Style (motivational, educational, supportive, challenging) - Not used in chat
-Reminder Frequency - Not implemented at all

## response streaming
The ai response is streamed in a typewriting fashion

## Importing files 
The user clicks on the paperclip icon, the user chooses some files (no ocr implemented  for pdf yet). A miniature version of the files appear next to the text input field. Multiple files are displayed from left to right.The user can click on a file's little 'x' mark on its right corner to remove the file. Upon pressing 'send', the miniature files appear in the chat and are sent to the ai

## Taking photos
The user clicks on the camera icon, a permission is displayed to access he webcam on desktop, or the camera on smartphones. After taking the photo, a miniature version of the photo appears next to the text input field. Multiple photos are displayed from left to right. Upon pressing 'send', the miniature photo appears in the chat and is sent to the ai

## Categorised file management
When the user send files and photos, they each receive a categorization. Currently, no smart system in place, by default all files are marked as uncategorised by the system. Those files are send saved and visible in the file manager page, when categories can be changed manually.
Note : currently, the permission to access the microphone is triggered and displayed as soon as the user enters the chat page 

## audio transcription
The user presses the microphone button, the button pulses red and the user starts talking, to stop the recording the user can either press the microphone again, or wait a few seconds for the recording to stop automatically. Once the recording has been stopped, the audio is transcribed to text and displayed in the text input field. Currently only works for english vocabulary via browser api. The transcriber can be set in the settings.(transcription via openai and google not yet functioning)

## messages persistence
The user messages and attachments are visible in the chat and go up has new messages appear.

## Memories access 
When the user sends a message, 2 things happen in parallel :
1- The message is sent to an AI (a reviewer), to review if the message is relevant to be saved in the user's memory. If the message is relevant, it is saved in the user's memory and can be accessed in the memory page. The AI reviewer is currently set to Google Gemini 2.0 Flash Lite model by default.
2- The user's message is displayed in the chat, relevant memories are retrieved, the system gathers the last 20 messages of the current conversation, and everything is sent to the AI coach normally.

Note: the system retrieves relevant memories based on two main criteria:

A- Semantic Similarity: 
Memories whose embeddings are semantically similar to a single 'context embedding' (generated from the current user message combined with the last 5 messages of the current conversation) are retrieved if their similarity score exceeds the defined threshold (0.7 by default).
B- High Importance and Recency: 
Separately, up to the top 3 most recent memories with an "ImportanceScore" greater than 0.8 are also retrieved. These are added to the list of relevant memories, ensuring that critical and recent information is always considered, regardless of their semantic similarity to the current context.

The two criteria act independently to select memories, and the resulting sets are combined, sorted by relevance, and then limited to a maximum number of results.

## Explicit memory creation
The user can direclty ask the ai coach to save a memory.

## new chat
The user can press the 'new chat' button to start a new conversation.

## history
The user can press the 'history' button, see the list of all previous chat, click on one and open it with all messages and attachments still present.

# Health dashboard page.
Dependencies : file manager, settings

## adding metrics
The user clicks on the 'add metrics' button, a modal opens with all metrics, he clicks the '+' symbol of the metrics he wants, a pop up appears to notify the user  with a success message, metrics appear in the dashboard.

## removing metrics
The user clicks on 'remove metrics', a 'cancel' and 'remove selected' buttons appear, a checkbox appears next to all metrics, the user checks some boxes, then clicks on 'remove selected', the metrics disappear from the dashboard. 
If the user clicks on 'cancel', it unchecks the checkboxes and the buttons 'cancel' and 'remove selected' disappear.

## Trend
The user clicks on a dropdown to choose between 'last 7 days', 'last 30 days', 'last90 days'. Choosing one changes the trend of all metrics in the page 

## Import health data
The user clicks on 'Import health data', clicks on 'choose file', and choose a file, such as the exported data of the iphone's health app. Then the user chooses the time range (for example: 1 month for the last month of data). Available ranges are 1, 3, 6 and 12 months. The user can choose the 'duplicate detection time window' (i feel like this should be in a config file, not accessible to the user). The user presses 'parse and preview'. The file is sliced, the system iterates through the slices with the most recent data until it reaches the past point selected by the user (here, 1 month), a modal opens with the number of valid data and the number of skipped data, the user presses a button to continue, the data are saved in the database and displayed in the health dashboard, the file is saved in file manager?

## Reset data
By pressing the button 'reset data', a confirmation modal opens, the user clicks on 'reset all data', then all data in the health dashboard and database are deleted, and the user is notified with a success message.

## Download PDF
The user clicks on the 'download pdf', the system gathers the latest health data, generates a pdf and makes it available to download. 

## Health Tabs
The user can clicks on different tabs (overview, body, heart, lifestyle, medical, advanced) to only display the metrics related to the tab. 

## AI Access data
In settings, the user can toggle on or off the type health data the ai has access to, and save the changes.

## Data retention policies
In settings, the user how long a type of data needs to be retained.
Note : nothing implemented to automatically delete data yet, and save the changes.

## Data Export & Portability
In settings, the user can toggle on or off 'auto-export', choose the export format (pdf, json, csv), can include ai interactions, view access log and export the data, and save the changes.
Note : exporting data might be redundant with the 'download pdf' feature.

# Connected devices

nothing implemented yet

# Memory page
dependencies : chat, settings 

## Overview
The user can see at the top an overview of the number of memories 

## Memory tabs
The user can click on each tab to display the memories associated. In each tab, there is an description about what the category in a blue rectangle.

## labels
Each memory has labels that can be selected and deselected by user to controlled which memories to display

## Displaying memory
To see the memories, the user must press the button 'show my stored memories' (i think this was to load the application faster, so the memories don't have to be loaded on start)

## Manual memory entry
The user clicks on 'add memory, a modal opens, the user types a message, choose a category and an importance level. From there, it uses the existing memory processing system like chat does. Hence, it is then sent to an 'ai memory reviewer' (i feel like the importance level should be attributed by the ai, even the category), the ai response is then added to the memory page and saved in the database.

## Deleting memories
A checkbox is visible next to all memories, the user check boxes, a red button appears 'delete selected', the user presses that button, the memories are removed from the page and deleted from the database.
After checking boxes, a 'clear' button also appear, clicling on it, clears all check marks for all boxes, which makes the delete button disappear as well.

## memory deduplication
A smart system is in place to ensure there are no duplicate memories

# File Manager
dependencies : chat, settings

## Upload files
The user clicks on 'upload files", a modal opens, the user choose the file in his device and the category. Compression is attempted for large files (>5MB) using the Universal File (Go acceleration) Service.The file is then visible in the page with some metadata.

## download files
The user can click on the 'download' icon' of each file, the file is downloaded to the user's device.

## file selection
Each file has a checkbox next to it, the user can check boxes individually or check the very first one at the top, which selects all files.

## changing/removing categories
The user can check multiple files' boxes, click on 'categorize', and choose a new category for the files, or remove the category of the file, making the file uncategorised (what for ?).

## File tabs
The user can click on each tab to display the files associated with a category

## deleting files
the user checks the boxes of some files, a red button 'delete' appears, the user user clicks on it, a confirmation pops-up and the file is deleted

## sharing files
the user checks some files and can click on either 'share' for a ling, or 'QR' for a qr code.

## refresh
The user can press the 'refresh' button if a file is not immediately visible (need to check the necessity of it)

## files display
The user can choose to display the files in list view or grid

# Settings
dependencis : chat, health, memory, file 

## Account 
The user can set his photo, full name, email address, and password

## coaching preferences
The user can set the primary goal via a dropdown, the coach communication style, the reminder frequency and the area of focus. (need to check if any of those has been implemented and is taken into account by the ai when a message is sent)

## preferences
The user can configure dark mode, push notifications, email summaries, and data sharing preferences

## File Management
The user can set retention policies for different file importance levels - high value files (unlimited by default), medium value files (90 days), and low value files (30 days)

# AI Configuration
The user can choose the AI provider (OpenAI or Google), select specific models, enable automatic model selection, set transcription provider, choose preferred language, and configure memory detection settings

# Health Data Privacy
The user can control health data consent settings, manage data visibility preferences, and configure retention policies for different health data categories

# Performance
The user can enable Go acceleration for file processing, configure caching options, and manage background processing settings (this should be a backend configuration, the user should not care about that)