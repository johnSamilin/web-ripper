import { Sequelize } from 'sequelize';
import UserModel from './User.js';
import fs from 'fs';
import path from 'path';

// Ensure database directory exists
const dbPath = process.env.DATABASE_PATH || './database.sqlite';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Remove corrupted database file if it exists
if (fs.existsSync(dbPath)) {
  try {
    // Test if file is a valid SQLite database
    const testSequelize = new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: false
    });
    await testSequelize.authenticate();
    await testSequelize.close();
  } catch (error) {
    console.log('🗑️  Removing corrupted database file...');
    fs.unlinkSync(dbPath);
    if (fs.existsSync(`${dbPath}-journal`)) {
      fs.unlinkSync(`${dbPath}-journal`);
    }
  }
}

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    freezeTableName: true
  }
});

const User = UserModel(sequelize);

// Test connection
try {
  await sequelize.authenticate();
  console.log('🗄️  Database connection established successfully.');
} catch (error) {
  console.error('❌ Unable to connect to the database:', error);
}

// Sync models
await sequelize.sync({ alter: true });
console.log('📊 Database models synchronized.');

export { sequelize, User };