const fs = require('fs');
let s = fs.readFileSync('src/types/database.types.ts', 'utf8');
s = s.replace(/Update: \{[\s\S]*?\}/g, match => match + '\n          Relationships: any[]');
fs.writeFileSync('src/types/database.types.ts', s);
