const fs = require('fs');
const content = fs.readFileSync('.next/server/chunks/345.js', 'utf8');
const match = content.match(/.{0,200}useContext.{0,200}/g);
if (match) {
    match.forEach(m => console.log(m));
}
