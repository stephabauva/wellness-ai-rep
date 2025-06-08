## 🐞 Issues and 📝 Things to Do

✅ = Already done  
❌ = Not yet done  
❓ = Needs confirmation / investigation  


---  


### 🐞 Issues (Bugs / Technical Errors)


<br>

#### 🟥 High Priority (Critical to UX/Functionality)

  ❌ history shows each message instead of title and date  

  ❌ New message is not immediatly visible in the chat after beign sent

<br>

#### 🟨 Medium Priority (Important for UX/Polish)

  ❓ Web Speech API mic stops after short pause — increase pause duration (uncertain if fixed)  

  ❌ Speech-to-text with OpenAI: saying “this is a test” returns “thank you” — major transcription issue  

  ❌ Speech-to-text with Google: API seems blocked — check API permissions (see Perplexity history: google transcription error)  

  ✅ Mic error on click-back (“aborted”) now handled gracefully  


---  


### 📝 Things to Do


<br>

#### 🟥 High Priority (Critical to UX/Functionality)

  ❌ Implement “New chat” button functionality (UI exists, backend logic pending)  

  ❌ Images, documents and photos must be displayed in the chat

  ❌ Chat input disappears when switching tabs — should persist and offer a “clear” button  

  ❌ Refactor `openai-service.ts`: split OpenAI and Google algorithms into separate service files  

  ✅ “New chat” button added  

  ✅ AI now has full context of current chat  


<br>

#### 🟨 Medium Priority (Important for UX/Polish)

  ❌ Dark mode toggle not working  

  ❌ French version needed  

  ❌ Need to optimize coach and system prompts  


<br>

#### 🟩 Low Priority (Polish/Nice-to-Have)

  ❌ implement technics to handle long conversations  

  ❌ Health Dashboard pulls from local storage file — should switch to DB when ready  

  ❌ Missing functionality to save daily nutritional facts to see progression over time  

  ✅ Mic icon remains instead of rotating ring and blinks red while recording  

  ✅ Image inputs (“can’t process images”) now handled properly  

  ✅ No persistence in chat context — now resolved  