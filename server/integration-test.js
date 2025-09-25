import { config } from 'dotenv';
import { io } from 'socket.io-client';
import fetch from 'node-fetch';
import assert from 'assert';
import path from 'path';
import fs from 'fs/promises';

// Load environment variables
config();

const BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log('🔍 Starting integration tests...');
    let testsPassed = 0;
    let testsFailed = 0;

    try {
        // Test 1: Server Health Check
        console.log('\n1️⃣ Testing server health...');
        try {
            const healthResponse = await fetch(`${BASE_URL}/health`);
            assert(healthResponse.ok);
            console.log('✅ Health check passed');
            testsPassed++;
        } catch (err) {
            console.error('❌ Health check failed:', err.message);
            testsFailed++;
        }

        // Test 2: Admin Authentication
        console.log('\n2️⃣ Testing admin authentication...');
        try {
            // Test valid credentials
            const socket = io(`${BASE_URL}/admin`, {
                auth: { token: ADMIN_PASSWORD }
            });

            await new Promise((resolve, reject) => {
                socket.on('connect', () => {
                    console.log('✅ Valid admin authentication passed');
                    socket.disconnect();
                    resolve();
                });

                socket.on('connect_error', (err) => reject(err));
                setTimeout(() => reject(new Error('Connection timeout')), 5000);
            });

            // Test invalid credentials
            const invalidSocket = io(`${BASE_URL}/admin`, {
                auth: { token: 'wrong-password' }
            });

            await new Promise((resolve) => {
                invalidSocket.on('connect_error', (err) => {
                    if (err.message.includes('Authentication failed')) {
                        console.log('✅ Invalid authentication correctly rejected');
                        resolve();
                    }
                });
                setTimeout(resolve, 3000);
            });

            testsPassed++;
        } catch (err) {
            console.error('❌ Authentication test failed:', err.message);
            testsFailed++;
        }

        // Test 3: Visit Logging
        console.log('\n3️⃣ Testing visit logging...');
        try {
            const visitPayload = {
                url: 'http://test.com',
                userAgent: 'Integration Test Bot',
                deviceType: 'test',
                screenResolution: '1920x1080',
                timezone: 'UTC',
                languages: 'en'
            };

            const logResponse = await fetch(`${BASE_URL}/api/log-visit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Integration Test Bot'
                },
                body: JSON.stringify(visitPayload)
            });

            assert(logResponse.ok);
            console.log('✅ Visit logging passed');
            testsPassed++;
        } catch (err) {
            console.error('❌ Visit logging failed:', err.message);
            testsFailed++;
        }

        // Test 4: Visit Retrieval
        console.log('\n4️⃣ Testing visit retrieval...');
        try {
            await wait(1000); // Wait for visit to be saved
            const visitsResponse = await fetch(`${BASE_URL}/api/clicks`);
            assert(visitsResponse.ok);
            
            const visits = await visitsResponse.json();
            assert(Array.isArray(visits));
            assert(visits.length > 0);
            
            const lastVisit = visits[visits.length - 1];
            assert(lastVisit.userAgent === 'Integration Test Bot');
            
            console.log('✅ Visit retrieval passed');
            testsPassed++;
        } catch (err) {
            console.error('❌ Visit retrieval failed:', err.message);
            testsFailed++;
        }

        // Test 5: Real-time Updates
        console.log('\n5️⃣ Testing real-time updates...');
        try {
            const socket = io(`${BASE_URL}/admin`, {
                auth: { token: ADMIN_PASSWORD }
            });

            await new Promise((resolve, reject) => {
                socket.on('connect', async () => {
                    try {
                        // Listen for visit events
                        const visitPromise = new Promise(resolve => {
                            socket.on('visit', (data) => {
                                assert(data.userAgent === 'Real-time Test Bot');
                                resolve();
                            });
                        });

                        // Log a new visit
                        await fetch(`${BASE_URL}/api/log-visit`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'User-Agent': 'Real-time Test Bot'
                            },
                            body: JSON.stringify({
                                url: 'http://test.com/realtime',
                                deviceType: 'test'
                            })
                        });

                        await visitPromise;
                        console.log('✅ Real-time updates passed');
                        socket.disconnect();
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                });

                socket.on('connect_error', reject);
                setTimeout(() => reject(new Error('Real-time test timeout')), 5000);
            });

            testsPassed++;
        } catch (err) {
            console.error('❌ Real-time updates failed:', err.message);
            testsFailed++;
        }

        // Test 6: Rate Limiting
        console.log('\n6️⃣ Testing rate limiting...');
        try {
            const requests = Array(6).fill().map(() => 
                fetch(`${BASE_URL}/api/log-visit`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Rate Limit Test Bot'
                    },
                    body: JSON.stringify({
                        url: 'http://test.com/ratelimit',
                        deviceType: 'test'
                    })
                })
            );

            const results = await Promise.all(requests);
            const lastResponse = results[results.length - 1];
            assert(!lastResponse.ok); // Last request should be rate limited

            console.log('✅ Rate limiting passed');
            testsPassed++;
        } catch (err) {
            console.error('❌ Rate limiting failed:', err.message);
            testsFailed++;
        }

        // Print Results
        console.log('\n📊 Test Results:');
        console.log(`Passed: ${testsPassed}`);
        console.log(`Failed: ${testsFailed}`);
        console.log(`Total: ${testsPassed + testsFailed}`);

        if (testsFailed > 0) {
            console.log('\n❌ Some tests failed!');
            process.exit(1);
        } else {
            console.log('\n✅ All tests passed!');
            process.exit(0);
        }

    } catch (error) {
        console.error('\n💥 Fatal error:', error);
        process.exit(1);
    }
}

runTests().catch(console.error);