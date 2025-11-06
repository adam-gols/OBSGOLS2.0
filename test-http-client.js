/**
 * Test script for the HTTP Google Sheets client
 */

import { HTTPGoogleSheetsClient } from './src/integrations/google-sheets/http-api-client.js';

async function testHTTPClient() {
    console.log('🧪 Testing HTTP Google Sheets Client...\n');
    
    const client = new HTTPGoogleSheetsClient('http://localhost:8080');
    
    // Test health check
    console.log('1. Testing health check...');
    try {
        const health = await client.getHealthStatus();
        console.log('✅ Health check:', health);
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return;
    }
    
    // Test events list
    console.log('\n2. Testing events list...');
    try {
        const events = await client.getEvents();
        console.log('✅ Events retrieved:', events.length, 'events');
        if (events.length > 0) {
            console.log('   First event:', events[0]);
        }
    } catch (error) {
        console.error('❌ Events list failed:', error.message);
    }
    
    // Test operations data (if we have an event)
    console.log('\n3. Testing operations data...');
    try {
        // Use a test spreadsheet ID (you can replace this with a real one)
        const testOpsId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'; // Google's example spreadsheet
        const operations = await client.getOperationsData(testOpsId);
        console.log('✅ Operations data retrieved');
        console.log('   Site info items:', operations.site_info.length);
        console.log('   Schedule items:', operations.master_schedule.length);
    } catch (error) {
        console.error('❌ Operations data failed:', error.message);
    }
    
    console.log('\n🎉 Test completed!');
    
    // Clean up
    client.stopHealthChecking();
}

// Run the test
testHTTPClient().catch(console.error);
