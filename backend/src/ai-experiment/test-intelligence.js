const intelligenceService = require('./IntelligenceService');

async function testBrain() {
  await intelligenceService.initialize();
  
  console.log('\n📊 Clinical Registry Statistics:');
  console.log(intelligenceService.getRegistryStats());

  const searchSymptoms = ['chest pain', 'fever'];
  console.log(`\n🔍 Querying Intelligence Hub for: ${searchSymptoms.join(', ')}...`);
  
  const predictions = intelligenceService.predict(searchSymptoms);
  
  if (predictions.length > 0) {
    console.log('✅ Matches Found in Knowledge Manifold:');
    predictions.forEach((p, i) => {
      console.log(`  [Match ${i+1}] Source: ${p.label || 'N/A'} -> Data:`, JSON.stringify(p).substring(0, 100) + '...');
    });
  } else {
    console.log('⚠️ No direct matches found in current layers.');
  }

  console.log('\n🧠 RoboMed Intelligence Hub Test Sequence Finalized.');
}

testBrain();
