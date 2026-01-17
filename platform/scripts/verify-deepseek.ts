import { DeepSeekService } from '../Module_11_Common/src/services/deepseek-r1.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ConsoleLogger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { of } from 'rxjs';

// Mock HttpService
const mockHttpService = {
    post: (url: string, body: any, config: any) => {
        // We will assert this is called later, or let it fail if real call needed.
        // But DeepSeekService uses HttpService from @nestjs/axios which returns Observable.
        // We want REAL call.
        // We need a real HttpService.
        // But instantiating real HttpService requires axios.
        // Let's rely on axios directly or try to instantiate HttpService.
        // HttpService in @nestjs/axios wraps axios.
        return of({
            data: {
                choices: [
                    { message: { content: "Mocked Response: Yes, I can help you with that analysis." } }
                ],
                usage: { total_tokens: 50 }
            }
        });
    },
    axiosRef: {
        post: async (url, body, config) => {
            // Real axios call?
            const axios = require('axios');
            return axios.post(url, body, config);
        }
    }
} as any;

// Real HttpService manually (if possible) or just use axios
// DeepSeekService uses this.httpService.post(...).pipe(...)
// If I want to test REAL API, I need real HttpService.
import { HttpService as RealHttpService } from '@nestjs/axios';
import * as axios from 'axios';

dotenv.config();

async function run() {
    console.log('--- Verifying DeepSeek Service (Isolated) ---');
    console.log('API Key present:', !!process.env.DEEPSEEK_API_KEY);

    // Manual Dependency Injection
    const configService = new ConfigService();
    // Create HttpService wrapper around axios that matches NestJS HttpService interface (Observable)
    const httpService = {
        post: (url: string, data: any, config: any) => {
            return of({
                data: {
                    // Since we can't easily wrap axios in Observable here without more imports,
                    // We will try to make a REAL call using axios inside the observable?
                    // Or better: Just use axios and return 'of(result)'.
                    // Wait, 'of' creates a synchronous observable.
                    // We need async.
                    // Let's use 'from(promise)'.
                }
            });
        }
    };

    // Better approach:
    // Redefine httpService to meaningful object
    const { from } = require('rxjs');
    const axios = require('axios');

    const realHttpService = {
        post: (url, data, config) => {
            return from(axios.post(url, data, config));
        }
    };

    const deepSeekService = new DeepSeekService(configService as any, realHttpService as any);

    // Test 1: CFO Persona
    console.log('\nTest 1: CFO Persona Reasoning');
    try {
        const response = await deepSeekService.generate({
            systemPrompt: "You are a CFO.",
            prompt: "What is the risk of 30 day payment terms?",
            temperature: 0.3
        });
        console.log('✅ Response:', response.text);
    } catch (error) {
        console.error('❌ Failed:', error.message);
        if (error.response) console.error('Data:', error.response.data);
    }

    // Test 2: Concierge Persona
    console.log('\nTest 2: Concierge Persona');
    try {
        const response = await deepSeekService.generate({
            systemPrompt: "You are a helpful concierge.",
            prompt: "Can I pay partially?",
            temperature: 0.7
        });
        console.log('✅ Response:', response.text);
    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

run();
