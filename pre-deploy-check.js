const fs = require('fs');
const path = require('path');

function checkProductionReadiness() {
    const checks = {
        cssExists: false,
        jsExists: false,
        indexExists: false,
        requiredAssets: false
    };
    
    // Check CSS files
    checks.cssExists = fs.existsSync(path.join(__dirname, 'css', 'style.css')) &&
                      fs.existsSync(path.join(__dirname, 'css', 'themes.css'));
    
    // Check JS files
    checks.jsExists = fs.existsSync(path.join(__dirname, 'js', 'main.js'));
    
    // Check index.html
    checks.indexExists = fs.existsSync(path.join(__dirname, 'index.html'));
    
    // Check required asset folders
    checks.requiredAssets = fs.existsSync(path.join(__dirname, 'assets'));
    
    // Print results
    console.log('\n=== Production Readiness Check ===\n');
    console.log('✓ CSS files:', checks.cssExists ? 'Present' : 'Missing');
    console.log('✓ JavaScript files:', checks.jsExists ? 'Present' : 'Missing');
    console.log('✓ Index file:', checks.indexExists ? 'Present' : 'Missing');
    console.log('✓ Assets folder:', checks.requiredAssets ? 'Present' : 'Missing');
    
    // Check API URL in main.js
    if (checks.jsExists) {
        const mainJs = fs.readFileSync(path.join(__dirname, 'js', 'main.js'), 'utf8');
        if (mainJs.includes('makxsensi-api.onrender.com')) {
            console.log('✓ API URL: Production URL configured');
        } else {
            console.log('⚠ API URL: Warning - Check production API URL configuration');
        }
    }
    
    // Check for development artifacts
    const hasSourceMaps = fs.readdirSync(path.join(__dirname, 'css'))
        .some(file => file.endsWith('.map'));
    if (hasSourceMaps) {
        console.log('⚠ Warning: Source maps found in CSS directory');
    }
    
    // Validate HTML
    if (checks.indexExists) {
        const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
        if (html.includes('console.log')) {
            console.log('⚠ Warning: console.log statements found in HTML');
        }
    }
    
    console.log('\nRecommendations:');
    console.log('1. Ensure all console.log statements are removed for production');
    console.log('2. Verify Razorpay integration keys are production keys');
    console.log('3. Check all API endpoints use HTTPS');
    console.log('4. Verify all external resources use HTTPS');
    console.log('5. Test modal on different screen sizes\n');
    
    return Object.values(checks).every(check => check);
}

checkProductionReadiness();