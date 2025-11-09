const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const dataPath = path.join(__dirname, '..', 'data');
const mockPrograms = require(path.join(dataPath, 'mockPrograms.json'));

app.get('/api/programs', (req, res) => {
  res.json({ programs: mockPrograms.slice(0, 50) });
});

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});

