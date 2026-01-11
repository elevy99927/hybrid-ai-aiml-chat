import { AimlEngine } from '../aiml-engine';

describe('Pattern Priority Resolution', () => {
  let engine: AimlEngine;

  beforeEach(() => {
    engine = new AimlEngine();
  });

  it('should prioritize more specific patterns over general ones', async () => {
    const aimlXml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <aiml>
        <!-- General pattern with wildcard -->
        <category>
          <pattern>WHAT IS *</pattern>
          <template>General answer about <star/>.</template>
        </category>
        
        <!-- More specific pattern -->
        <category>
          <pattern>WHAT IS KUBERNETES</pattern>
          <template>Kubernetes is a container orchestration platform.</template>
        </category>
        
        <!-- Very general pattern -->
        <category>
          <pattern>*</pattern>
          <template>I don't understand that.</template>
        </category>
        
        <!-- Another specific pattern -->
        <category>
          <pattern>WHAT IS DOCKER CONTAINER</pattern>
          <template>Docker containers are lightweight virtualization.</template>
        </category>
      </aiml>
    `;

    await engine.loadAimlFromString(aimlXml);

    // Test that specific patterns are matched over general ones
    const kubernetesResponse = engine.processMessage('what is kubernetes');
    expect(kubernetesResponse).toBe('Kubernetes is a container orchestration platform.');

    const dockerResponse = engine.processMessage('what is docker container');
    expect(dockerResponse).toBe('Docker containers are lightweight virtualization.');

    // Test that general pattern is used when no specific match
    const generalResponse = engine.processMessage('what is python');
    expect(generalResponse).toBe('General answer about python.');

    // Test that catch-all pattern is used as last resort
    const catchAllResponse = engine.processMessage('random question');
    expect(catchAllResponse).toBe("I don't understand that.");
  });

  it('should handle patterns with multiple wildcards correctly', async () => {
    const aimlXml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <aiml>
        <!-- Pattern with multiple wildcards -->
        <category>
          <pattern>HOW TO * IN *</pattern>
          <template>To <star index="1"/> in <star index="2"/>, you need to follow best practices.</template>
        </category>
        
        <!-- More specific pattern -->
        <category>
          <pattern>HOW TO DEPLOY KUBERNETES IN PRODUCTION</pattern>
          <template>Deploying Kubernetes in production requires careful planning and security considerations.</template>
        </category>
        
        <!-- Pattern with single wildcard -->
        <category>
          <pattern>HOW TO *</pattern>
          <template>Here's how to <star/>: follow the documentation.</template>
        </category>
      </aiml>
    `;

    await engine.loadAimlFromString(aimlXml);

    // Most specific should win
    const specificResponse = engine.processMessage('how to deploy kubernetes in production');
    expect(specificResponse).toBe('Deploying Kubernetes in production requires careful planning and security considerations.');

    // Two wildcards pattern
    const twoWildcardsResponse = engine.processMessage('how to deploy apps in kubernetes');
    expect(twoWildcardsResponse).toBe('To deploy apps in kubernetes, you need to follow best practices.');

    // Single wildcard pattern
    const singleWildcardResponse = engine.processMessage('how to code');
    expect(singleWildcardResponse).toBe("Here's how to code: follow the documentation.");
  });

  it('should calculate priority correctly based on specificity', async () => {
    const aimlXml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <aiml>
        <category>
          <pattern>*</pattern>
          <template>Catch all</template>
        </category>
        
        <category>
          <pattern>HELLO *</pattern>
          <template>Hello with wildcard</template>
        </category>
        
        <category>
          <pattern>HELLO WORLD</pattern>
          <template>Hello world specific</template>
        </category>
        
        <category>
          <pattern>HELLO WORLD TODAY</pattern>
          <template>Hello world today very specific</template>
        </category>
      </aiml>
    `;

    await engine.loadAimlFromString(aimlXml);

    const patterns = engine.getPatterns();
    
    // Verify patterns are sorted by priority (higher priority first)
    expect(patterns[0].pattern).toBe('HELLO WORLD TODAY'); // Most specific
    expect(patterns[1].pattern).toBe('HELLO WORLD');       // Second most specific
    expect(patterns[2].pattern).toBe('HELLO *');           // Has wildcard
    expect(patterns[3].pattern).toBe('*');                 // Least specific

    // Verify priority values
    expect(patterns[0].priority).toBeGreaterThan(patterns[1].priority);
    expect(patterns[1].priority).toBeGreaterThan(patterns[2].priority);
    expect(patterns[2].priority).toBeGreaterThan(patterns[3].priority);
  });
});