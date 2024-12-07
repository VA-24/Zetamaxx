const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose')
const logger = require('./middleware/logger')
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('ZETAMAXX MONGODB CONNECTION SUCCESSFUL'))
  .catch(err => console.error('ZETAMAXX MONGODB CONNECTION ERROR:', err));

app.use(cors());
app.use(express.json());
app.use(logger);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/matchmaking', require('./routes/matchmaking'));

app.get('/api/', (req, res) => {
  res.json({ message: 'serve online' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});