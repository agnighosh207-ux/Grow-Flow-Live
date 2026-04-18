const puppeteer = require('C:\\Users\\Pc\\AppData\\Roaming\\npm\\node_modules\\puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Listen to console logs and errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('BROWSER_ERROR:', msg.text());
            }
        });
        
        page.on('pageerror', err => {
            console.log('PAGE_EXCEPTION:', err.toString());
        });

        console.log("Navigating to http://localhost:5173/");
        await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 30000 });
        console.log("Finished waiting for networkidle0. Capturing HTML snippet...");
        
        const html = await page.content();
        console.log("HTML length:", html.length);
        if (html.includes('<div id="root"></div>')) {
            console.log("Found empty root div. Check for errors above.");
        }
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer Script Error:", e);
    }
})();
