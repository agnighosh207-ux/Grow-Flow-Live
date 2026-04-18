import fs from 'fs';

let env = '';
try {
  env = fs.readFileSync('.env', 'utf-8');
} catch (e) {
  console.error('.env file missing', e);
  process.exit(1);
}

const clerkSecretKeyMatch = env.match(/CLERK_SECRET_KEY=(.*)/);
if (!clerkSecretKeyMatch) {
  console.error('CLERK_SECRET_KEY missing in .env');
  process.exit(1);
}
const secretKey = clerkSecretKeyMatch[1].trim();

async function createAdminUser() {
  try {
    const res = await fetch('https://api.clerk.com/v1/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretKey}`
      },
      body: JSON.stringify({
        email_address: ['agnighosh207@gmail.com'],
        username: 'admin_123',
        password: 'Agnish222',
        skip_password_checks: true,
        skip_password_requirement: true
      })
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Failed to create user:', data.errors || data);
    } else {
      console.log('Successfully created user:', data.id);
    }
  } catch (error) {
    console.error('Failed to create user:', error);
  }
}

createAdminUser();
