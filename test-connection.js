const fs = require('fs');
if (fs.existsSync('.env')) {
  console.log('.env exists, lines:');
  const lines = fs.readFileSync('.env', 'utf8').split('\n');
  lines.forEach(l => {
    if (l.trim() && !l.startsWith('#')) {
      const parts = l.split('=');
      console.log(`- ${parts[0]}: ${parts[1] ? (parts[1].includes('[YOUR-PASSWORD]') ? 'placeholder' : 'actual_value_exists') : 'empty'}`);
    }
  });
} else {
  console.log('.env does not exist');
}
