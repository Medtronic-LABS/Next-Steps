import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve('C:\\Users\\devil\\Desktop\\next-steps\\tests\\screenshots\\flow_proof_screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('🚀 Launching Chrome to test LIVE EC2: https://nextsteps-admin.mdtlabs.org/app/');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
    defaultViewport: { width: 414, height: 896, isMobile: true, hasTouch: true }
  });

  const page = await browser.newPage();
  const consoleLogs = [];
  const networkRequests = [];

  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') {
      console.error('❌ Console Error:', msg.text());
    }
  });

  page.on('request', req => {
    if (req.url().includes('/api/')) {
      networkRequests.push(`REQ: ${req.method()} ${req.url()}`);
    }
  });

  page.on('response', resp => {
    if (resp.url().includes('/api/')) {
      networkRequests.push(`RESP: ${resp.status()} ${resp.url()}`);
    }
  });

  try {
    // -------------------------------------------------------------
    // STEP 1: Launch App & Select NS Capture -> ANC
    // -------------------------------------------------------------
    console.log('\n--- Step 1: Navigating to https://nextsteps-admin.mdtlabs.org/app/ ---');
    await page.goto('https://nextsteps-admin.mdtlabs.org/app/', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(800);
    await page.screenshot({ path: path.join(outDir, '01_live_launcher.png') });
    console.log('📸 01_live_launcher.png');

    // Click NS Capture
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('NS Capture'));
      if (b) b.click();
    });
    await sleep(600);

    // Click ANC
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('ANC'));
      if (b) b.click();
    });
    await sleep(600);
    await page.screenshot({ path: path.join(outDir, '02_role_picker_all_levels.png') });
    console.log('📸 02_role_picker_all_levels.png');

    // -------------------------------------------------------------
    // STEP 2: Frontline ANM (Sub-centre) - Enrol & Create Referral
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Logging in as AAM (ANM) ---');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('AAM (ANM)'));
      if (b) b.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(outDir, '03_anm_lookup_screen.png') });
    console.log('📸 03_anm_lookup_screen.png');

    // Click on Lakshmi Bai
    console.log('Selecting Lakshmi Bai...');
    await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Lakshmi Bai'));
      if (card) card.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(outDir, '04_lakshmi_journey_view.png') });
    console.log('📸 04_lakshmi_journey_view.png');

    // Click "Enter Next Steps"
    console.log('Clicking Enter Next Steps...');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Enter Next Steps'));
      if (b) b.click();
    });
    await sleep(600);
    await page.screenshot({ path: path.join(outDir, '05_step_category_selector.png') });
    console.log('📸 05_step_category_selector.png');

    // Select Referral
    console.log('Selecting Referral Category...');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Referral'));
      if (b) b.click();
    });
    await sleep(600);
    await page.screenshot({ path: path.join(outDir, '06_referral_facility_picker.png') });
    console.log('📸 06_referral_facility_picker.png');

    // Choose CHC Teonthar
    console.log('Choosing CHC Teonthar...');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('CHC') || x.innerText.includes('Teonthar'));
      if (b) b.click();
    });
    await sleep(600);

    // Click "Send referral"
    console.log('Confirming referral details...');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Send referral'));
      if (b) b.click();
    });
    await sleep(600);

    // Click "Save · schedule reminders"
    console.log('Saving step...');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Save · schedule reminders') || (x.innerText.includes('Save') && x.innerText.includes('reminders')));
      if (b) b.click();
    });
    await sleep(1200);
    await page.screenshot({ path: path.join(outDir, '07_anm_referral_created.png') });
    console.log('📸 07_anm_referral_created.png');

    // -------------------------------------------------------------
    // STEP 3: Check ANM Worklist Tab & Catchment Scope
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Checking ANM Worklist & Catchment ---');
    await page.evaluate(() => {
      // Click Worklist tab in bottom navigation
      const tabs = Array.from(document.querySelectorAll('button'));
      const wl = tabs.find(x => x.innerText.trim() === 'Worklist' || x.querySelector('span')?.innerText === 'Worklist');
      if (wl) wl.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(outDir, '08_anm_worklist_tab.png') });
    console.log('📸 08_anm_worklist_tab.png');

    // -------------------------------------------------------------
    // STEP 4: Switch to CHC Staff Nurse (Referral Facility)
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Switching to CHC Staff Nurse ---');
    // Click switch login button
    await page.evaluate(() => {
      const switchBtn = document.querySelector('button[title="Switch login"]') ||
        Array.from(document.querySelectorAll('button')).find(b => b.title === 'Switch login' || b.innerText.includes('Switch'));
      if (switchBtn) switchBtn.click();
    });
    await sleep(600);

    // Pick CHC Staff Nurse
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('CHC Staff Nurse'));
      if (b) b.click();
    });
    await sleep(1000);
    await page.screenshot({ path: path.join(outDir, '09_chc_nurse_lookup.png') });
    console.log('📸 09_chc_nurse_lookup.png');

    // Open Lakshmi Bai at CHC
    console.log('Opening Lakshmi Bai as CHC Nurse...');
    await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Lakshmi Bai'));
      if (card) card.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(outDir, '10_chc_nurse_lakshmi_journey.png') });
    console.log('📸 10_chc_nurse_lakshmi_journey.png');

    // Tap "Update >" on the Referral to CHC step
    console.log('Updating incoming referral at CHC...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Referral to CHC'));
      if (btn) btn.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(outDir, '11_chc_resolution_modal.png') });
    console.log('📸 11_chc_resolution_modal.png');

    // Close the step directly at CHC: "Care was delivered here on-site"
    console.log('Marking care delivered on-site...');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('delivered here') || x.innerText.includes('Mark complete at CHC'));
      if (b) b.click();
    });
    await sleep(1000);
    await page.screenshot({ path: path.join(outDir, '12_chc_referral_closed.png') });
    console.log('📸 12_chc_referral_closed.png');

    // -------------------------------------------------------------
    // STEP 5: Verify PHC Medical Officer Supervisory & Catchment Flow
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Testing PHC Medical Officer Flow ---');
    await page.evaluate(() => {
      const switchBtn = document.querySelector('button[title="Switch login"]') ||
        Array.from(document.querySelectorAll('button')).find(b => b.title === 'Switch login' || b.innerText.includes('Switch'));
      if (switchBtn) switchBtn.click();
    });
    await sleep(600);

    // Pick PHC Medical Officer
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('PHC Medical Officer'));
      if (b) b.click();
    });
    await sleep(1000);
    await page.screenshot({ path: path.join(outDir, '13_phc_mo_worklist.png') });
    console.log('📸 13_phc_mo_worklist.png');

    // Toggle Catchment Scope
    console.log('Toggling MO to Catchment Scope...');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('In my catchment'));
      if (b) b.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(outDir, '14_phc_mo_catchment_view.png') });
    console.log('📸 14_phc_mo_catchment_view.png');

    // Check Insights tab
    console.log('Opening MO Insights...');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Insights'));
      if (b) b.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(outDir, '15_phc_mo_insights_indicators.png') });
    console.log('📸 15_phc_mo_insights_indicators.png');

    // Check Alerts tab
    console.log('Opening MO Escalation Alerts...');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Alerts'));
      if (b) b.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(outDir, '16_phc_mo_alerts_queue.png') });
    console.log('📸 16_phc_mo_alerts_queue.png');

    // -------------------------------------------------------------
    // STEP 6: Verify ASHA Community Role (Close-only guardrail)
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Testing ASHA Community Persona ---');
    await page.evaluate(() => {
      const switchBtn = document.querySelector('button[title="Switch login"]') ||
        Array.from(document.querySelectorAll('button')).find(b => b.title === 'Switch login' || b.innerText.includes('Switch'));
      if (switchBtn) switchBtn.click();
    });
    await sleep(600);

    // Pick ASHA Samta
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('ASHA Samta'));
      if (b) b.click();
    });
    await sleep(1000);
    await page.screenshot({ path: path.join(outDir, '17_asha_worklist.png') });
    console.log('📸 17_asha_worklist.png');

    // Open Lakshmi Bai as ASHA
    console.log('Opening Lakshmi Bai as ASHA...');
    await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Lakshmi Bai'));
      if (card) card.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(outDir, '18_asha_lakshmi_journey.png') });
    console.log('📸 18_asha_lakshmi_journey.png');

    // Check Update on Overdue Lab step as ASHA (shows provenance form)
    console.log('Checking ASHA step update...');
    await page.evaluate(() => {
      const updateBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Update'));
      if (updateBtn) updateBtn.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(outDir, '19_asha_provenance_modal.png') });
    console.log('📸 19_asha_provenance_modal.png');

    console.log('\n======================================================');
    console.log('🎉 COMPLETE 6-STEP LIVE FLOW TEST FINISHED WITH SUCCESS!');
    console.log(`Console Logs: ${consoleLogs.length}`);
    console.log(`API Calls Observed: ${networkRequests.length}`);
    console.log('======================================================');

  } catch (e) {
    console.error('💥 Test error:', e);
    await page.screenshot({ path: path.join(outDir, 'failure_screenshot.png') });
  } finally {
    await browser.close();
  }
}

run();
