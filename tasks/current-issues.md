Two major events have happened that seem to have broken the application : fixes for numerous typescript errors after checking with 'npm run check', and the refactoring in smaller files of server/routes.ts that was almost 4000 lines of code (archive in server/routes.ts.archive).

# General
[ ] Need a central config file manage logging and some parts of settings that should not be handled by the user such as Performance Optimizations

# Chat :

[ ] the chat does not send health data to the ai yet, only memories

[X] npx vitest run --reporter=verbose)
  ⎿  Error: stderr | client/src/components/ChatInputArea.test.tsx > ChatInputArea > 
     should trigger camera input on Camera button click (when getUserMedia fails)
     Error accessing camera: Error: Simulated camera access failure

[x] user newer conversations not visible in the chat history window or not loadable. Note : i noticed in the console log ' [AiService] Starting ChatGPT memory deduplication processing { userId: 1, conversationId: '', messageLength: 11 }', there is no convesation Id.

[x] clicking on a past conversation in history results in error "[plugin:runtime-error-plugin] Rendered fewer hooks than expected. This may be caused by an accidental early return statement."

[X] Need to confirm if uploaded file and photo persists in the conversations of the chat history

[X] console log shows many duplicate logs

[?] (!might be fixed) in console log i see "[WARN ] [memory] Background queue growing large: 14 tasks", this needs to be simplified and optimized

[?] (seems to work now) Transcription of audio to text is not persistant in input field if the user do other audio transcriptions before sending

[ ] Error Handling: What happens if a message fails to send (e.g., network error)? Is there visual feedback?

[ ] File Type/Size Restrictions: No mention of supported file types or maximum file sizes.

[ ] Upload Progress: For larger files, a progress indicator would be beneficial.

[X] the permission to access the microphone is triggered and displayed as soon as the user enters the chat page, it should triggered only for the first time the user press the mic button or be set by default in the settings.

[ ] missing visual indication in the chat that a message was saved as a memory

[ ] no encryption for messages, attachments, and memories at rest and in transit.(necessary ?)

[ ] No user authentication implemented 

# Health dashboard :
[ ] The user gets a confirmation that metrics were successfully removed, but the metrics are still visible on screen

[ ] the 'add metrics' can be pressed while the 'remove metrics' has already been pressed, you can had and delete metrics at the same time. it should be one at a time, you can't press 'add metrics' if the 'remove metrics' has been pressed, the user must either 'cancel' or delete metrics first. 

 [X]  completely remove the upload file functionality from the health dashboard (keep the go acceleration because the file manager uses it as well)

 [X] create some sample data to imitate the data coming from the health app from the iphone to populate the heath dashboard when pressing a 'load sample' button. With 7 days, 30 days and 90 days data to test the trend dropdown -> new table with sample data. 

[X] The metrics trend does not update after the user clicks on a dropdown to choose between 'last 7 days', 'last 30 days', 'last90 days'. Needs to check the implementation.

[ ] the graphs weekly activity trend, sleep quality, nutrition summary, and hydration are fixed, can't be removed. Also, no way for the user to manually add goals, like for the hydration for example.

[ ] clicking on 'download pdf' results in error [plugin:runtime-error-plugin] Method is not a valid HTTP token. need to verify the full implementation.

[ ] Regardless on the tab selected the weekly activity trend, sleep quality, nutrition, summary, hydration and coaching insights are always displayed

[ ] the settings need to be simplified, especially i question the relevance of the Data Export & Portability section.

# Memory page :

[X] the overview of the number of memories shows total memories, preferences, instruction and personal info, while the tabs show 'all, preferences, personal, context and instructions', this needs to be harmonized

[ ] In the overview, the count for all memory types is not right, it does not display for the total memories and i need to refresh the page to get the updated count after i add a memory

[ ] when the button 'show my stored memories' is pressed, it says ' not stored memories' for 1s and then display the memories, need to fix that.

[ ] a memory was added to the memory page when the user asked explicitely to save somethig in memory, but a similar memory already existed, the ai should have checked with the memory deduplication service to see first if a similar memory existed and the ai should have tehn told teh user their memory already exists in the db. 

[ ] there is no search bar to find memories by content or filter by category or source (chat or manual entry)

[ ] The user can't manually edit a memory

[ ] if there are many memories, simply displaying them all at once will lead to performance issues. need to implement pagination in each tab

[ ] the user is not able to export his memories, nothing implemented yet

# File manager :

[X] when uploading a file, the user can't choose a category, there are no visible categories.

[X] Only the 'All' and 'Uncategorised' are visible

[X] after checking some files boxes and clicking 'categorise', there are no categories visible.

[X] Go acceleration service health check fails at startup showing '[WARN ] [express] GET /api/accelerate/health 503' - this is expected behavior since Go service should only start on-demand for large files >5MB, but the health check creates unnecessary warnings

# Settings :

[ ] when scrolling down, the user can scroll much lower than the UI

[ ] overall, the all settings can be stripped  down and simplified

[ ] multi language support (the app can't change its main language, english (current language), french and brazilian-portuguese are the first three languages to  support)

[ ] Account functionalities not implemented (you can't change your photo, can't change password)

[ ] Coach Style & Focus Areas isnot yet integrated into chat context. Coach Communication Style (motivational, educational, supportive, challenging) is not used in chat. Reminder Frequency is not implemented at all

[ ] Dark Mode Functionality - The toggle exists but there's no actual theme switching implementation. No CSS variables, no theme context, no visual changes when toggled.

[ ] Push Notifications Implementation - Toggle exists but no actual push notification service integration

[ ] Email Summaries Backend - Toggle exists but likely no email service implementation

[ ] Data Sharing Logic - Toggle exists but unclear what data sharing actually controls

[ ] The user can enable Go acceleration for file processing, configure caching options, and manage background processing settings : this should be a backend configuration, the user should not care about that

# Bloated codebase
read report at codebase-bloat-complexity-analysis-report.md

# Unintegrated code :
read report at codebase-audit-unused-features.md

# Performance issues :
Read report at performance-analysis.md

# Migration all typescrip to Go
Read typescript-to-go-migration-report.md