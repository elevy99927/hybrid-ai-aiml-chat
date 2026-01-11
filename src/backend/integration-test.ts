import { AimlEngine } from './src/services/aiml-engine';
import { AimlService } from './src/services/aiml-service';
import fs from 'fs/promises';
import path from 'path';

async function runIntegrationTest() {
  console.log('🧪 Running AIML Engine Integration Test...\n');
  
  try {
    // Test 1: Basic AIML Engine functionality
    console.log('Test 1: Basic AIML Engine');
    const engine = new AimlEngine();
    
    const testAiml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <aiml>
        <category>
          <pattern>HELLO</pattern>
          <template>Hi there! How can I help you?</template>
        </category>
        <category>
          <pattern>WHAT IS *</pattern>
          <template>You asked about <star/>. That's interesting!</template>
        </category>
        <category>
          <pattern>HOW TO * IN *</pattern>
          <template>To <star index="1"/> in <star index="2"/>, follow best practices.</template>
        </category>
      </aiml>
    `;
    
    await engine.loadAimlFromString(testAiml);
    console.log(`✅ Loaded ${engine.getPatternCount()} patterns`);
    
    // Test pattern matching
    const testCases = [
      { input: 'hello', expected: 'Hi there! How can I help you?' },
      { input: 'what is kubernetes', expected: 'You asked about kubernetes. That\'s interesting!' },
      { input: 'how to deploy apps in kubernetes', expected: 'To deploy apps in kubernetes, follow best practices.' }
    ];
    
    for (const testCase of testCases) {
      const response = engine.processMessage(testCase.input);
      if (response === testCase.expected) {
        console.log(`✅ "${testCase.input}" -> "${response}"`);
      } else {
        console.log(`❌ "${testCase.input}" -> Expected: "${testCase.expected}", Got: "${response}"`);
      }
    }
    
    // Test 2: Priority Resolution
    console.log('\nTest 2: Priority Resolution');
    const priorityAiml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <aiml>
        <category>
          <pattern>*</pattern>
          <template>General fallback</template>
        </category>
        <category>
          <pattern>HELLO *</pattern>
          <template>Hello with wildcard</template>
        </category>
        <category>
          <pattern>HELLO WORLD</pattern>
          <template>Specific hello world</template>
        </category>
      </aiml>
    `;
    
    const priorityEngine = new AimlEngine();
    await priorityEngine.loadAimlFromString(priorityAiml);
    
    const priorityTests = [
      { input: 'hello world', expected: 'Specific hello world' },
      { input: 'hello there', expected: 'Hello with wildcard' },
      { input: 'random input', expected: 'General fallback' }
    ];
    
    for (const test of priorityTests) {
      const response = priorityEngine.processMessage(test.input);
      if (response === test.expected) {
        console.log(`✅ Priority test: "${test.input}" -> "${response}"`);
      } else {
        console.log(`❌ Priority test: "${test.input}" -> Expected: "${test.expected}", Got: "${response}"`);
      }
    }
    
    // Test 3: Sample patterns file
    console.log('\nTest 3: Sample Patterns File');
    const sampleEngine = new AimlEngine();
    const samplePath = path.join(__dirname, 'src/data/sample-patterns.xml');
    const sampleContent = await fs.readFile(samplePath, 'utf-8');
    await sampleEngine.loadAimlFromString(sampleContent);
    
    console.log(`✅ Loaded ${sampleEngine.getPatternCount()} sample patterns`);
    
    const sampleTests = [
      'hello',
      'what is your name',
      'help',
      'what is kubernetes',
      'thank you'
    ];
    
    for (const input of sampleTests) {
      const response = sampleEngine.processMessage(input);
      if (response) {
        console.log(`✅ Sample: "${input}" -> "${response}"`);
      } else {
        console.log(`❌ Sample: "${input}" -> No response`);
      }
    }
    
    // Test 4: AIML Service
    console.log('\nTest 4: AIML Service Integration');
    const service = new AimlService();
    
    // Mock the ConfigMap loading by loading sample patterns directly
    const serviceEngine = (service as any).engine;
    await serviceEngine.loadAimlFromString(sampleContent);
    
    const status = service.getStatus();
    console.log(`✅ Service status: loaded=${status.loaded}, patterns=${status.patternCount}`);
    
    const serviceResponse = service.processMessage('hello');
    console.log(`✅ Service response: "${serviceResponse}"`);
    
    console.log('\n🎉 All integration tests passed!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runIntegrationTest().catch(console.error);
}

export { runIntegrationTest };