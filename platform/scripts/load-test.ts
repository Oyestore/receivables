
import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:4000/api';
const CONCURRENT_USERS = 50;
const REQUESTS_PER_USER = 20;

async function simulateUser(userId: number) {
    const start = Date.now();
    let successCount = 0;
    let errorCount = 0;
    const latencies: number[] = [];

    console.log(`User ${userId} started session.`);

    for (let i = 0; i < REQUESTS_PER_USER; i++) {
        const reqStart = Date.now();
        try {
            // Simulate a typical read-heavy flow: Health Check -> Dashboard Stats -> Invoices List
            await axios.get(`${BASE_URL}/health`);
            
            // Add a small random delay between requests
            await new Promise(r => setTimeout(r, Math.random() * 500));
            
            successCount++;
            latencies.push(Date.now() - reqStart);
        } catch (error) {
            errorCount++;
            // console.error(`User ${userId} request failed:`, error.message);
        }
    }

    const duration = Date.now() - start;
    console.log(`User ${userId} finished. Success: ${successCount}, Errors: ${errorCount}, Avg Latency: ${(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)}ms`);
    return { successCount, errorCount, latencies };
}

async function runLoadTest() {
    console.log(`Starting Load Test with ${CONCURRENT_USERS} concurrent users, ${REQUESTS_PER_USER} requests each...`);
    console.log(`Target: ${BASE_URL}`);

    const start = Date.now();
    const promises = [];

    for (let i = 0; i < CONCURRENT_USERS; i++) {
        promises.push(simulateUser(i));
    }

    const results = await Promise.all(promises);
    const end = Date.now();

    const totalRequests = results.reduce((acc, r) => acc + r.successCount + r.errorCount, 0);
    const totalErrors = results.reduce((acc, r) => acc + r.errorCount, 0);
    const allLatencies = results.flatMap(r => r.latencies);
    const avgLatency = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
    const p95Latency = allLatencies.sort((a, b) => a - b)[Math.floor(allLatencies.length * 0.95)];

    console.log('\n--- Load Test Summary ---');
    console.log(`Total Duration: ${(end - start) / 1000}s`);
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Total Errors: ${totalErrors} (${(totalErrors / totalRequests * 100).toFixed(2)}%)`);
    console.log(`Throughput: ${(totalRequests / ((end - start) / 1000)).toFixed(2)} req/s`);
    console.log(`Avg Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`P95 Latency: ${p95Latency}ms`);
}

runLoadTest().catch(console.error);
