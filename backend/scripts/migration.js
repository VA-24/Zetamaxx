const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function migrateUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const result = await User.updateMany(
      {},
      { 
        $set: { 
          lookingForMatch: false,
          rating: 1000
        } 
      },
      { upsert: false }
    );

    console.log(`Migration completed. Modified ${result.modifiedCount} documents`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateUsers();
