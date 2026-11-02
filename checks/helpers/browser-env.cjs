// Resolve a real installed Chromium without altering tests or their assertions.
const fs=require('node:fs'),path=require('node:path');
const pw=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const candidates=[process.env.BROWSER_EXECUTABLE,
 path.join(process.env.PROGRAMFILES||'C:/Program Files','Google/Chrome/Application/chrome.exe'),
 path.join(process.env.LOCALAPPDATA||'','Google/Chrome/Application/chrome.exe'),
 path.join(process.env['PROGRAMFILES(X86)']||'C:/Program Files (x86)','Microsoft/Edge/Application/msedge.exe'),
 pw.chromium.executablePath(),
].filter(Boolean);
const executablePath=candidates.find(file=>fs.existsSync(file));
if(!executablePath)throw Error('No Chromium found. Install Chrome or run: npx playwright-core install chromium');
process.env.BROWSER_EXECUTABLE=executablePath;
const launch=pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch=options=>launch({...options,executablePath:options?.executablePath||executablePath});
