const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../config/database');
const { migrate } = require('./migrate');

function seed() {
  console.log('Running seed...');

  // Run migrations first
  migrate();

  // Clear existing data (order matters for foreign keys)
  db.exec(`
    DELETE FROM usage_logs;
    DELETE FROM staff_meal_rights;
    DELETE FROM staff;
    DELETE FROM meal_types;
    DELETE FROM departments;
    DELETE FROM users;
    DELETE FROM holidays;
    DELETE FROM quota_refresh_logs;
  `);

  // Reset AUTOINCREMENT counters so IDs start from 1 again
  db.exec(`
    DELETE FROM sqlite_sequence WHERE name IN (
      'usage_logs', 'staff_meal_rights', 'staff', 'meal_types',
      'departments', 'users', 'holidays', 'quota_refresh_logs'
    );
  `);

  // --- Users ---
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)
  `);

  const adminPassword = crypto.randomBytes(9).toString('base64url');
  const kasiyerPassword = crypto.randomBytes(9).toString('base64url');
  const adminHash = bcrypt.hashSync(adminPassword, 10);
  const kasiyerHash = bcrypt.hashSync(kasiyerPassword, 10);

  insertUser.run('admin', adminHash, 'admin');
  insertUser.run('kasiyer', kasiyerHash, 'user');
  console.log('✓ Users seeded');

  // --- Departments ---
  const insertDept = db.prepare(`
    INSERT INTO departments (name) VALUES (?)
  `);

  const deptIT = insertDept.run('IT');
  const deptMuhasebe = insertDept.run('Muhasebe');
  const deptIK = insertDept.run('İnsan Kaynakları');
  console.log('✓ Departments seeded');

  // --- Meal Types ---
  const insertMealType = db.prepare(`
    INSERT INTO meal_types (name, daily_limit) VALUES (?, ?)
  `);

  insertMealType.run('Kahvaltı', 1);
  insertMealType.run('Öğle', 1);
  insertMealType.run('Akşam', 1);
  console.log('✓ Meal types seeded');

  // --- Staff ---
  const insertStaff = db.prepare(`
    INSERT INTO staff (barcode, first_name, last_name, department_id) VALUES (?, ?, ?, ?)
  `);

  const staffData = [
    ['1001', 'Ahmet', 'Yılmaz', deptIT.lastInsertRowid],
    ['1002', 'Mehmet', 'Kaya', deptIT.lastInsertRowid],
    ['1003', 'Ayşe', 'Demir', deptMuhasebe.lastInsertRowid],
    ['1004', 'Fatma', 'Çelik', deptMuhasebe.lastInsertRowid],
    ['1005', 'Ali', 'Öztürk', deptIK.lastInsertRowid],
  ];

  for (const [barcode, firstName, lastName, deptId] of staffData) {
    insertStaff.run(barcode, firstName, lastName, deptId);
  }
  console.log('✓ Staff seeded');

  // --- Staff Meal Rights ---
  const insertRight = db.prepare(`
    INSERT INTO staff_meal_rights (staff_id, meal_type_id, monthly_quota) VALUES (?, ?, ?)
  `);

  // Get staff and meal type IDs
  const staffIds = db.prepare('SELECT id FROM staff').all().map((r) => r.id);
  const mealTypeIds = db.prepare('SELECT id FROM meal_types').all().map((r) => r.id);

  const insertRights = db.transaction(() => {
    for (const staffId of staffIds) {
      for (const mealTypeId of mealTypeIds) {
        insertRight.run(staffId, mealTypeId, 22);
      }
    }
  });

  insertRights();
  console.log('✓ Staff meal rights seeded');

  console.log('\nSeed completed successfully!');
  console.log('Admin login: admin /', adminPassword);
  console.log('Kasiyer login: kasiyer /', kasiyerPassword);
}

// Run if called directly
if (require.main === module) {
  seed();
  process.exit(0);
}

module.exports = { seed };
