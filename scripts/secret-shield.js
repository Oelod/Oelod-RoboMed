const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// --- Institutional Secret Shield Configuration ---
const FORBIDDEN_STRINGS = [
  'JWT_' + 'SECRET=',
  'CLOUDINARY_' + 'API_KEY=',
  'CLOUDINARY_' + 'API_SECRET=',
  'MONGODB_' + 'URI=mongodb+srv',
  'PASS' + 'WORD=',
  'STRIPE_' + 'SECRET_KEY='
];

const IGNORED_EXTENSIONS = ['.md', '.txt', '.example', '.json'];

function checkSecrets() {
  console.log('🛡️ RoboMed Secret Shield: Scanning staged changes...');

  try {
    // Get list of staged files
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
      .split('\n')
      .filter(file => file && !IGNORED_EXTENSIONS.includes(path.extname(file)));

    if (stagedFiles.length === 0) {
      console.log('✅ No code files changed. Shield pass.');
      process.exit(0);
    }

    let leakFound = false;

    stagedFiles.forEach(file => {
      // Ensure file exists (it could be a deletion)
      if (!fs.existsSync(file)) return;
      
      const content = fs.readFileSync(file, 'utf8');
      
      FORBIDDEN_STRINGS.forEach(secret => {
        if (content.includes(secret)) {
          console.error(`\n🚨 CRITICAL SECURITY FAULT DETECTED!`);
          console.error(`📍 Location: ${file}`);
          console.error(`🔍 Found forbidden string: "${secret}"`);
          console.error(`❌ Commit blocked for institutional safety.\n`);
          leakFound = true;
        }
      });
    });

    if (leakFound) {
      console.log('⚠️ Action required: Remove secrets from your code and use .env files instead.');
      process.exit(1);
    } else {
      console.log('✅ No infrastructure leaks detected. Shield pass.');
      process.exit(0);
    }

  } catch (error) {
    console.error('⚠️ Secret Shield Error:', error.message);
    process.exit(0); // Fail open only on system error
  }
}

checkSecrets();
