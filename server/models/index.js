import { Sequelize } from 'sequelize';
import UserModel from './User.js';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_PATH || './database.sqlite',
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