const fs = require('fs');
const content = fs.readFileSync('.next/server/chunks/345.js', 'utf8');
const match = content.match(/var [a-z] = __webpack_require__\(\d+\)/g);
console.log(match ? match.join('\n') : "no require");
