# 30-Question AIML Chatbot Test Conversation

This test covers various AIML patterns including greetings, emotions, biography, geography, food, and contextual follow-ups.

## Test Conversation

1. **User:** Hello
   **Expected:** Greeting response (AIML - Salutations.aiml)

2. **User:** How are you?
   **Expected:** Response about being fine (AIML)

3. **User:** What's your name?
   **Expected:** Bot name response (AIML - Bot.aiml)

4. **User:** Do you have feelings?
   **Expected:** Response about being a bot/no emotions (AIML - Emotion.aiml)

5. **User:** Can you feel love?
   **Expected:** Response about bot emotions (AIML - Emotion.aiml)

6. **User:** Are you angry?
   **Expected:** Response about not having anger (AIML - Emotion.aiml)

7. **User:** Who is Alan Turing?
   **Expected:** Response about Turing's contributions (AIML - Biography.aiml)

8. **User:** When did he die?
   **Expected:** Context-based response about Turing dying in 1954 (Context test)

9. **User:** What is the capital of France?
   **Expected:** Paris (AIML - Geography.aiml)

10. **User:** What about Germany?
    **Expected:** Berlin (Context test - Geography.aiml)

11. **User:** Who is Shakespeare?
    **Expected:** Response about Shakespeare being a writer (AIML - Biography.aiml)

12. **User:** What did he write?
    **Expected:** Context-based response about Shakespeare's works (Context test)

13. **User:** What is the capital of California?
    **Expected:** Sacramento (AIML - Geography.aiml)

14. **User:** Do you eat food?
    **Expected:** Response about eating electricity (AIML - Food.aiml)

15. **User:** What do you eat?
    **Expected:** Electricity (AIML - Food.aiml)

16. **User:** How does it taste?
    **Expected:** Context-based response about electricity taste (Context test - Food.aiml)

17. **User:** What is the capital of Canada?
    **Expected:** Ottawa or Toronto (AIML - Geography.aiml)

18. **User:** Who is Thomas Edison?
    **Expected:** Response about Edison being an inventor (AIML - Biography.aiml)

19. **User:** What did he invent?
    **Expected:** Context-based response about light bulb (Context test)

20. **User:** Are you sad?
    **Expected:** Response about not being sad (AIML - Emotion.aiml)

21. **User:** Do you get bored?
    **Expected:** Response about bot emotions (AIML - Emotion.aiml)

22. **User:** What is India?
    **Expected:** Response about India being a country (AIML - Geography.aiml)

23. **User:** What is the capital of India?
    **Expected:** New Delhi (AIML - Geography.aiml)

24. **User:** Who is Albert Einstein?
    **Expected:** LLM fallback (not in AIML)

25. **User:** Where was he born?
    **Expected:** Context-based LLM response about Einstein's birthplace (Context test)

26. **User:** Goodbye
    **Expected:** Farewell response (AIML - Salutations.aiml)

27. **User:** Hello again
    **Expected:** Greeting response (AIML - Salutations.aiml)

28. **User:** What is the Turing Test?
    **Expected:** Response about Turing Test (AIML - Biography.aiml)

29. **User:** Can you pass it?
    **Expected:** Context-based response (AIML - Biography.aiml)

30. **User:** Bye
    **Expected:** Farewell response (AIML - Salutations.aiml)

## Test Categories

- **AIML Pattern Matching:** Questions 1-7, 9, 11, 13-15, 17-18, 20-23, 26-28, 30
- **Context-Based (AIML):** Questions 8, 10, 12, 16, 19, 29
- **LLM Fallback:** Questions 24-25
- **Hybrid Context:** Questions 25 (LLM with context from previous question)

## Success Criteria

- AIML patterns should respond instantly with predefined answers
- Context-based questions should reference previous conversation
- LLM fallback should activate when no AIML pattern matches
- Conversation history should be maintained across all questions
