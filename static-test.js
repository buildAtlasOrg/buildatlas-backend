const express = require('express');
const path = require('path');
const app = express();

const staticDir = path.resolve(__dirname, 'public');
console.log('STATIC TEST DIR:', staticDir);

app.use(express.static(staticDir));

app.listen(5050, () => {
  console.log('Static test server running on http://localhost:5050');
});
