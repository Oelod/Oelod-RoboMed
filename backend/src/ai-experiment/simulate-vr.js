const virtualResident = require('./VirtualResident');

async function simulateConversationalTriage() {
  console.log('--- OELOD VIRTUAL RESIDENT: CLINICAL INTAKE SIMULATION ---');

  const caseId = 'RM-INTAKE-2026-001';
  const userName = 'Specialist Oelod';

  console.log(`\n[SYSTEM] Initializing Personalized Session for: ${userName}`);
  
  // Start the session
  let currentResponse = await virtualResident.startSession(caseId, userName);
  
  const conversation = [
    "I'm feeling a bit tired, how are you?", // Small talk
    "Nice weather we're having.", // Small talk
    "I have a fever and my heart is pounding.", // Symptoms
    "I've had the fever for 5 days.", // Clinical detail
    "Yes, it radiates to my arm.", // Clinical detail (triggered for heart focus)
    "No, that's everything." // Final
  ];

  let turn = 0;
  while (turn < conversation.length) {
    if (typeof currentResponse === 'string') {
      console.log(`\n[O.V.R.] ${currentResponse}`);
    } else {
      break; 
    }
    
    let patientAnswer = conversation[turn];
    console.log(`[PATIENT] ${patientAnswer}`);
    
    currentResponse = await virtualResident.processResponse(caseId, patientAnswer);
    turn++;
  }

  // Final Sequence (Clerkship Generation)
  if (currentResponse && currentResponse.type === 'clerkship_final') {
    console.log('\n--- GENERATED STRUCTURED CLERKSHIP FOR SPECIALIST ---');
    console.log(JSON.stringify(currentResponse.content, null, 2));
  }

  console.log('\n[O.V.R.] Protocol Complete. Clerkship archived.');
}

simulateConversationalTriage();
