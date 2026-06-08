const fs = require('fs');
const path = require('path');
const home = process.env.USERPROFILE;

// Check .sf/orgs (newer sf CLI)
const sfOrgsDir = path.join(home, '.sf', 'orgs');
// Check .sfdx (older sfdx CLI)
const sfdxDir = path.join(home, '.sfdx');

console.log('Checking sf CLI auth...\n');

if (fs.existsSync(sfOrgsDir)) {
  const files = fs.readdirSync(sfOrgsDir);
  files.forEach(f => {
    try {
      const filePath = path.join(sfOrgsDir, f);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        const orgFile = path.join(filePath, 'user.json');
        if (fs.existsSync(orgFile)) {
          const d = JSON.parse(fs.readFileSync(orgFile, 'utf8'));
          console.log('Found org:', d.username, '|', d.instanceUrl);
        }
      } else {
        const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (d.username) console.log('Found org:', d.username, '|', d.instanceUrl, '| alias:', d.alias || 'none');
      }
    } catch(e) {}
  });
} else {
  console.log('.sf/orgs not found');
}

if (fs.existsSync(sfdxDir)) {
  const files = fs.readdirSync(sfdxDir);
  files.forEach(f => {
    if (f.endsWith('.json') && f !== 'alias.json') {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(sfdxDir, f), 'utf8'));
        if (d.username) console.log('SFDX org:', d.username, '|', d.instanceUrl);
      } catch(e) {}
    }
  });
}
