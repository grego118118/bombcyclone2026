const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log('🚀 Starting Storm Monitoring Script...');

    // 1. Launch Browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    try {
        // 2. Navigate to Weather.gov for Columbia, SC (as requested by user)
        console.log('📡 Fetching latest alerts for South Carolina...');
        await page.goto('https://forecast.weather.gov/MapClick.php?lat=34.0007&lon=-81.0348', {
            waitUntil: 'networkidle'
        });

        // 3. Extract Alert Information
        const alertData = await page.evaluate(() => {
            const alertBox = document.querySelector('.headline-content');
            const temp = document.querySelector('.myforecast-current-lrg')?.innerText;
            const conditions = document.querySelector('.myforecast-current')?.innerText;

            return {
                timestamp: new Date().toISOString(),
                alertText: alertBox ? alertBox.innerText.trim() : 'No active alerts detected.',
                currentTemp: temp || 'N/A',
                currentConditions: conditions || 'N/A'
            };
        });

        console.log('✅ Data Extracted:', alertData);

        // 4. Save Data to a JSON file for the website to read
        const dataPath = path.join(__dirname, '../data');
        if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);

        fs.writeFileSync(
            path.join(dataPath, 'latest_storm_data.json'),
            JSON.stringify(alertData, null, 2)
        );
        console.log('💾 Data saved to /data/latest_storm_data.json');

        // 5. Capture a Screenshot of the current forecast
        const screenshotPath = path.join(dataPath, 'storm_radar.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`📸 Screenshot saved to ${screenshotPath}`);

    } catch (error) {
        console.error('❌ Error during monitoring:', error);
    } finally {
        await browser.close();
        console.log('🏁 Script finished.');
    }
})();
