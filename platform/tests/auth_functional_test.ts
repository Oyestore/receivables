import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1/auth';
const TEST_USER = {
    email: `test.${Date.now()}@platform.com`, // Unique email
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User'
};

async function runFunctionalTest() {
    console.log('🚀 Starting Functional Test: Module 12 Auth');
    console.log('-------------------------------------------');

    try {
        // 1. Register
        console.log(`[1] Attempting Registration for ${TEST_USER.email}...`);
        const registerRes = await axios.post(`${API_URL}/register`, TEST_USER);

        if (registerRes.status === 201) {
            console.log('✅ Registration Successful!');
            console.log('   Token received:', !!registerRes.data.accessToken);
            console.log('   User ID:', registerRes.data.user.id);
            console.log('   Tenant ID:', registerRes.data.user.tenantId);
        } else {
            console.error('❌ Registration Failed:', registerRes.status, registerRes.data);
            process.exit(1);
        }

        // 2. Login
        console.log('\n[2] Attempting Login...');
        const loginRes = await axios.post(`${API_URL}/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });

        if (loginRes.status === 200 || loginRes.status === 201) {
            console.log('✅ Login Successful!');
            console.log('   Access Token:', !!loginRes.data.accessToken);
        } else {
            console.error('❌ Login Failed:', loginRes.status, loginRes.data);
        }

    } catch (error: any) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status, error.response.data);
        } else {
            console.error('❌ Network/Script Error:', error.message);
        }
    }
    console.log('-------------------------------------------');
}

runFunctionalTest();
