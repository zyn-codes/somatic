import io from 'socket.io-client';
import dotenv from 'dotenv';

dotenv.config({ path: process.cwd() + '/.env' });

const apiBase = process.env.VITE_API_URL || `http://localhost:${process.env.PORT || 3959}`;

async function testAdminSocket() {
  console.log('🔍 Starting admin socket tests...');

  // Test 1: Valid Authentication
  console.log('\n1️⃣ Testing valid authentication...');
  const validSocket = io(`${apiBase}/admin`, {
    auth: { token: process.env.ADMIN_PASSWORD },
    transports: ['websocket']
  });

  await new Promise((resolve, reject) => {
    validSocket.on('connect', () => {
      console.log('✅ Valid authentication successful');
      validSocket.disconnect();
      resolve();
    });

    validSocket.on('connect_error', (err) => {
      reject(new Error(`Valid authentication failed: ${err.message}`));
    });

    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });

  // Test 2: Invalid Authentication
  console.log('\n2️⃣ Testing invalid authentication...');
  const invalidSocket = io(`${apiBase}/admin`, {
    auth: { token: 'wrong-password' },
    transports: ['websocket']
  });

  await new Promise((resolve) => {
    invalidSocket.on('connect_error', (err) => {
      if (err.message.includes('Invalid credentials')) {
        console.log('✅ Invalid authentication correctly rejected');
        resolve();
      }
    });

    invalidSocket.on('connect', () => {
      throw new Error('Invalid authentication was incorrectly accepted');
    });

    setTimeout(resolve, 3000);
  });

  // Test 3: Reconnection
  console.log('\n3️⃣ Testing reconnection...');
  const reconnectSocket = io(`${apiBase}/admin`, {
    auth: { token: process.env.ADMIN_PASSWORD },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 3
  });

  await new Promise((resolve, reject) => {
    let connected = false;
    
    reconnectSocket.on('connect', () => {
      console.log('✅ Connected successfully');
      connected = true;
      reconnectSocket.disconnect();
      resolve();
    });

    reconnectSocket.on('connect_error', (err) => {
      if (!connected) {
        reject(new Error(`Reconnection failed: ${err.message}`));
      }
    });

    setTimeout(() => reject(new Error('Reconnection timeout')), 5000);
  });

  console.log('\n🎉 All admin socket tests passed successfully!');
  process.exit(0);
}

testAdminSocket().catch(err => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
