import { AimlEngine } from '../aiml-engine';

describe('AimlEngine', () => {
  let engine: AimlEngine;

  beforeEach(() => {
    engine = new AimlEngine();
  });

  describe('loadAimlFromString', () => {
    it('should load valid AIML patterns', async () => {
      const aimlXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <aiml>
          <category>
            <pattern>HELLO</pattern>
            <template>Hi there!</template>
          </category>
          <category>
            <pattern>WHAT IS YOUR NAME</pattern>
            <template>I am a chatbot.</template>
          </category>
        </aiml>
      `;

      await engine.loadAimlFromString(aimlXml);
      
      expect(engine.isLoaded()).toBe(true);
      expect(engine.getPatternCount()).toBe(2);
    });

    it('should handle invalid AIML format', async () => {
      const invalidXml = '<invalid>not aiml</invalid>';
      
      await expect(engine.loadAimlFromString(invalidXml))
        .rejects.toThrow('Invalid AIML format');
    });
  });

  describe('matchPattern', () => {
    beforeEach(async () => {
      const aimlXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <aiml>
          <category>
            <pattern>HELLO</pattern>
            <template>Hi there!</template>
          </category>
          <category>
            <pattern>WHAT IS *</pattern>
            <template>You asked about <star/>.</template>
          </category>
          <category>
            <pattern>* WEATHER *</pattern>
            <template>Weather info for <star/>.</template>
          </category>
        </aiml>
      `;
      
      await engine.loadAimlFromString(aimlXml);
    });

    it('should match exact patterns', () => {
      const pattern = engine.matchPattern('hello');
      expect(pattern).not.toBeNull();
      expect(pattern?.pattern).toBe('HELLO');
    });

    it('should match wildcard patterns', () => {
      const pattern = engine.matchPattern('what is kubernetes');
      expect(pattern).not.toBeNull();
      expect(pattern?.pattern).toBe('WHAT IS *');
    });

    it('should return null for no match', () => {
      const pattern = engine.matchPattern('unknown query');
      expect(pattern).toBeNull();
    });
  });

  describe('generateResponse', () => {
    beforeEach(async () => {
      const aimlXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <aiml>
          <category>
            <pattern>HELLO</pattern>
            <template>Hi there!</template>
          </category>
          <category>
            <pattern>WHAT IS *</pattern>
            <template>You asked about <star/>.</template>
          </category>
        </aiml>
      `;
      
      await engine.loadAimlFromString(aimlXml);
    });

    it('should generate simple responses', () => {
      const pattern = engine.matchPattern('hello');
      const response = engine.generateResponse(pattern!, 'hello');
      expect(response).toBe('Hi there!');
    });

    it('should substitute wildcards', () => {
      const pattern = engine.matchPattern('what is kubernetes');
      const response = engine.generateResponse(pattern!, 'what is kubernetes');
      expect(response).toBe('You asked about kubernetes.');
    });
  });

  describe('processMessage', () => {
    beforeEach(async () => {
      const aimlXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <aiml>
          <category>
            <pattern>HELLO</pattern>
            <template>Hi there!</template>
          </category>
          <category>
            <pattern>WHAT IS *</pattern>
            <template>You asked about <star/>.</template>
          </category>
        </aiml>
      `;
      
      await engine.loadAimlFromString(aimlXml);
    });

    it('should process messages end-to-end', () => {
      expect(engine.processMessage('hello')).toBe('Hi there!');
      expect(engine.processMessage('what is docker')).toBe('You asked about docker.');
      expect(engine.processMessage('unknown')).toBeNull();
    });
  });
});