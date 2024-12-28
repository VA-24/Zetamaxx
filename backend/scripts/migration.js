const mongoose = require('mongoose');
const User = require('../models/User');
const Match = require('../models/Match')
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function migrateUsers() {
  try {
    await mongoose.connect("mongodb+srv://vardhan:JjcfXCEu26tpPWXm@zetamaxx.k17ml.mongodb.net/?retryWrites=true&w=majority&appName=Zetamaxx");
    console.log('Connected to MongoDB');
    
    const result = await User.updateMany(
      {}, 
      { 
        $set: { 

          multiplayerGamesPlayed: 0,
          multiplayerResults: [],
          singleplayerGamesPlayed: 0,
          elo: 1000
        } 
      },
      { upsert: false }
    );

    // const result = await Match.deleteMany({ duration: 120 });

    console.log(`Migration completed. Modified ${result.modifiedCount} documents`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateUsers();
