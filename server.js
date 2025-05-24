const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Start server
app.listen(port, () => {
  console.log(`Flappy Bird clone running at http://localhost:${port}`);
});
