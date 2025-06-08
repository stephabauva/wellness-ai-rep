Issues
⸻

🟥 High Priority (Critical to UX/Functionality)

	•	❌ Implement “New chat” button functionality (UI exists, backend logic pending)

	•	❌ Chat input disappears when switching tabs — should persist and offer a “clear” button

	•	❌ Speech-to-text with OpenAI: saying “this is a test” returns “thank you” — major transcription issue
  
	•	❌ Speech-to-text with Google: API seems blocked — check API permissions (see Perplexity history: google transcription error)
  
	•	❌ Refactor openai-service.ts: split OpenAI and Google algorithms into separate service files
  
	•	✅ AI now has full context of current chat
	•	✅ “New chat” button added

⸻

🟨 Medium Priority (Important for UX/Polish)

	•	❓ Web Speech API mic stops after short pause — increase pause duration (uncertain if fixed)
  
	•	❌ Dark mode toggle not working
  
	•	❌ French version needed

	•	❌ Need to optimize coach and system prompts
  
	•	✅ Mic error on click-back (“aborted”) now handled gracefully

⸻

🟩 Low Priority (Polish/Nice-to-Have)

	•	❌ Health Dashboard pulls from local storage file — should switch to DB when ready

	•	❌ Missing functionality to save daily nutritional facts to see progresion over time
	
  
	•	✅ Mic icon remains instead of rotating ring and blinks red while recording
	•	✅ Image inputs (“can’t process images”) now handled properly
	•	✅ No persistence in chat context — now resolved
