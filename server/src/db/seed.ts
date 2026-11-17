/**
 * Script CLI para poblar la base de datos con datos de demostración.
 * Uso: `npm run seed`
 */
import { runMigrations } from './schema';
import { seedDemoData } from './seedData';

runMigrations();
seedDemoData(true);
console.log('✅ Base de datos poblada con datos de demostración de MyWallet.');
