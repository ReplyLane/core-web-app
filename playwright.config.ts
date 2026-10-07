import {defineConfig,devices} from "@playwright/test";
import {existsSync} from "node:fs";
const chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export default defineConfig({
 testDir:"./tests/e2e",fullyParallel:false,workers:1,retries:0,timeout:30000,
 outputDir:".sites-runtime/e2e-artifacts",
 reporter:[["list"],["json",{outputFile:".sites-runtime/e2e-results.json"}]],
 use:{baseURL:process.env.E2E_BASE_URL||"http://127.0.0.1:5173",trace:"retain-on-failure",screenshot:"only-on-failure",launchOptions:existsSync(chrome)?{executablePath:chrome}:{},viewport:{width:1440,height:1000}},
 webServer:{command:"npm run dev",url:"http://127.0.0.1:5173/favicon.svg",reuseExistingServer:true,timeout:60000},
 projects:[{name:"desktop",use:{viewport:{width:1440,height:1000}}},{name:"mobile",use:{...devices["iPhone 13"],defaultBrowserType:"chromium"}}],
});
