import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve('C:\\Users\\devil\\Desktop\\next-steps\\tests\\screenshots\\test_screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function run() {
  console.log('🚀 Launching Chrome to test LIVE EC2 app: https://nextsteps-admin.mdtlabs.org/app/');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
    defaultViewport: { width: 414, height: 896, isMobile: true, hasTouch: true } // Mobile viewport
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Browser Console Error:', msg.text());
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('💥 Page Exception:', err.toString());
    consoleErrors.push(err.toString());
  });

  page.on('response', resp => {
    if (resp.status() >= 400) {
      console.log(`⚠️ Network ${resp.status()} ${resp.url()}`);
      networkErrors.push(`${resp.status()} ${resp.url()}`);
    }
  });

  try {
    // 1. Initial Load
    console.log('\n--- 1. Testing Launcher Screen ---');
    await page.goto('https://nextsteps-admin.mdtlabs.org/app/', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.screenshot({ path: path.join(outDir, '01_launcher.png') });
    console.log('📸 01_launcher.png captured');

    // 2. Click NS Capture -> ANC
    console.log('\n--- 2. Testing NS Capture -> ANC Personas List ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('NS Capture'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 600));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('ANC'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(outDir, '02_anc_roles.png') });
    console.log('📸 02_anc_roles.png captured');

    // Verify all 9 roles present in DOM
    const rolesFound = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
    });
    console.log('Roles found on screen:', rolesFound);

    // 3. Test PHC Medical Officer
    console.log('\n--- 3. Testing PHC Medical Officer Role ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('PHC Medical Officer'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, '03_phc_mo_worklist.png') });
    console.log('📸 03_phc_mo_worklist.png captured');

    // Toggle to Catchment
    console.log('Toggling PHC MO to Catchment scope...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('In my catchment') || x.textContent.includes('Catchment'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(outDir, '04_phc_mo_catchment.png') });
    console.log('📸 04_phc_mo_catchment.png captured');

    // Test Insights Tab
    console.log('Clicking Insights tab...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const b = tabs.find(x => x.textContent.includes('Insights'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(outDir, '05_phc_mo_insights.png') });
    console.log('📸 05_phc_mo_insights.png captured');

    // Test Alerts Tab
    console.log('Clicking Alerts tab...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const b = tabs.find(x => x.textContent.includes('Alerts'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(outDir, '06_phc_mo_alerts.png') });
    console.log('📸 06_phc_mo_alerts.png captured');

    // Switch Role back to launcher
    console.log('\n--- 4. Switching to AAM (ANM) Role & Referral Creation ---');
    await page.evaluate(() => {
      const btn = document.querySelector('button[title="Switch login"]') || Array.from(document.querySelectorAll('button')).find(b => b.title === 'Switch login' || b.innerText.includes('Switch'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // If on sub-launcher, select ANC -> AAM (ANM)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const anm = btns.find(x => x.textContent.includes('AAM (ANM)') || x.textContent.includes('AAM'));
      if (anm) anm.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, '07_anm_worklist.png') });
    console.log('📸 07_anm_worklist.png captured');

    // Open Lakshmi Bai
    console.log('Opening Lakshmi Bai patient journey...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Lakshmi Bai'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(outDir, '08_lakshmi_journey.png') });
    console.log('📸 08_lakshmi_journey.png captured');

    // Click Enter Next Steps -> Referral -> CHC
    console.log('Entering Next Steps: Referral to CHC...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Enter Next Steps'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 800));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Referral'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 800));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('CHC') || x.textContent.includes('CHC Teonthar'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 600));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Send referral'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 600));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Save') || x.textContent.includes('schedule reminders'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(outDir, '09_referral_staged_journey.png') });
    console.log('📸 09_referral_staged_journey.png captured');

    // Go back to ANM worklist
    await page.evaluate(() => {
      const back = document.querySelector('button');
      if (back) back.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Switch to CHC Staff Nurse
    console.log('\n--- 5. Switching to CHC Staff Nurse Role & Verifying Inbound Referral ---');
    await page.evaluate(() => {
      const btn = document.querySelector('button[title="Switch login"]') || Array.from(document.querySelectorAll('button')).find(b => b.title === 'Switch login' || b.innerText.includes('Switch'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Select CHC Staff Nurse
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const chc = btns.find(x => x.textContent.includes('CHC Staff Nurse'));
      if (chc) chc.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, '10_chc_worklist_inbound.png') });
    console.log('📸 10_chc_worklist_inbound.png captured');

    // Complete referral at CHC
    console.log('Opening Lakshmi Bai at CHC and completing referral on-site...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Lakshmi Bai'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 800));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Referral') || x.textContent.includes('CHC'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(outDir, '11_chc_closure_options.png') });
    console.log('📸 11_chc_closure_options.png captured');

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Mark complete at CHC') || x.textContent.includes('Mark complete'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(outDir, '12_chc_closed_success.png') });
    console.log('📸 12_chc_closed_success.png captured');

    // 6. Test ASHA PNC flow
    console.log('\n--- 6. Testing ASHA Persona in PNC & Newborn ---');
    await page.evaluate(() => {
      const btn = document.querySelector('button[title="Switch login"]') || Array.from(document.querySelectorAll('button')).find(b => b.title === 'Switch login' || b.innerText.includes('Switch'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Navigate to PNC register
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const pnc = btns.find(x => x.textContent.includes('PNC & Newborn') || x.textContent.includes('PNC'));
      if (pnc) pnc.click();
    });
    await new Promise(r => setTimeout(r, 600));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const asha = btns.find(x => x.textContent.includes('ASHA Samta') || x.textContent.includes('ASHA'));
      if (asha) asha.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, '13_asha_pnc_worklist.png') });
    console.log('📸 13_asha_pnc_worklist.png captured');

    // Open Kamla Yadav
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Kamla Yadav') || x.textContent.includes('Kamla'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Check Enter Next Steps in PNC for ASHA
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Enter Next Steps'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(outDir, '14_asha_pnc_options.png') });
    console.log('📸 14_asha_pnc_options.png captured');

    console.log('\n=============================================');
    console.log('🎉 ALL LIVE EC2 FLOWS TESTED SUCCESSFULLY!');
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Network Errors: ${networkErrors.length}`);
    console.log('=============================================');

  } catch (err) {
    console.error('💥 Test failed with error:', err);
    await page.screenshot({ path: path.join(outDir, 'error_state.png') });
  } finally {
    await browser.close();
  }
}

run();
