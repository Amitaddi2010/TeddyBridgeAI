// Helper script to format Firebase credentials JSON for Render environment variable
// Usage: node format-firebase-credentials.js <path-to-service-account-key.json>

import fs from 'fs';

if (process.argv.length < 3) {
  console.error('Usage: node format-firebase-credentials.js <path-to-service-account-key.json>');
  process.exit(1);
}

const filePath = process.argv[2];

try {
  const jsonContent = fs.readFileSync(filePath, 'utf8');
  const jsonObject = JSON.parse(jsonContent);
  const singleLine = JSON.stringify(jsonObject);
  
  console.log('\n=== Copy the following and paste it as the value for FIREBASE_CREDENTIALS_JSON in Render ===\n');
  console.log(singleLine);
  console.log('\n=== End of FIREBASE_CREDENTIALS_JSON value ===\n');
  
  console.log('✅ Credentials formatted successfully!');
  console.log('\n📝 Instructions:');
  console.log('1. Copy the entire single-line JSON string above');
  console.log('2. Go to Render Dashboard → Your Service → Environment');
  console.log('3. Add new environment variable:');
  console.log('   Key: FIREBASE_CREDENTIALS_JSON');
  console.log('   Value: [paste the single-line JSON string]');
  console.log('4. Save and redeploy your service\n');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

