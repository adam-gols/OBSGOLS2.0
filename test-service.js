/**
 * Simple test of the Python service endpoints
 */

async function testService() {
    console.log('🧪 Testing Python Google Sheets Service...\n');
    
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    try {
        const response = await fetch('http://localhost:8080/health');
        const health = await response.json();
        console.log('✅ Health:', JSON.stringify(health, null, 2));
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return;
    }
    
    // Test events endpoint
    console.log('\n2. Testing events endpoint...');
    try {
        const response = await fetch('http://localhost:8080/events');
        const result = await response.json();
        console.log('✅ Events response:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log(`   Found ${result.count} events`);
        }
    } catch (error) {
        console.error('❌ Events request failed:', error.message);
    }
    
    // Test operations endpoint with Google's example spreadsheet
    console.log('\n3. Testing operations endpoint...');
    try {
        const testSpreadsheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'; // Google's example
        const response = await fetch(`http://localhost:8080/operations/${testSpreadsheetId}`);
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Operations data retrieved successfully');
            console.log(`   Site info items: ${result.data.site_info.length}`);
            console.log(`   Schedule items: ${result.data.master_schedule.length}`);
        } else {
            console.log('⚠️ Operations request returned error:', result.error);
        }
    } catch (error) {
        console.error('❌ Operations request failed:', error.message);
    }
    
    console.log('\n🎉 Service test completed!');
}

// Run the test
testService().catch(console.error);
