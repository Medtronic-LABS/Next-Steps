/**
 * OpenPHC Care Coordination Engine (CCE) Local Mock & Simulation Service
 * 
 * Simulates the OpenPHC CCE Microservice Suite:
 * 1. cce-collector-service: Ingestion of CloudEvents v1.0 & FHIR R4 Tasks (POST /v1/events)
 * 2. cce-compliance-service: Protocol & SLA adherence evaluation (GET /v1/compliance/slas, POST /v1/compliance/sweep)
 * 3. cce-intelligence-service: Intelligent receiver routing & automated adaptors (GET /v1/intelligence/dispatches)
 * 4. cce-analytics: Closed-loop metrics & impact comparison (GET /v1/cce/metrics)
 * 
 * Run with: node cce-local-mock.cjs
 */

const http = require("http");

const PORT = process.env.PORT || 8080;

// In-memory state for CCE simulation
const eventLog = [];
const activeSlas = [
  {
    id: "sla_ref_01",
    stepId: "step_01",
    patientName: "Sunita Devi",
    patientPhone: "+91 98261 23451",
    category: "REFERRAL",
    targetFacility: "District Hospital, Rewa",
    slaWindowHours: 72,
    hoursElapsed: 34,
    status: "ON_TRACK",
    startedAt: new Date(Date.now() - 34 * 3600 * 1000).toISOString(),
    dueAt: new Date(Date.now() + 38 * 3600 * 1000).toISOString(),
  },
  {
    id: "sla_ref_02",
    stepId: "step_02",
    patientName: "Rekha Kumari",
    patientPhone: "+91 98261 23452",
    category: "REFERRAL",
    targetFacility: "Medical College, Jabalpur",
    slaWindowHours: 72,
    hoursElapsed: 96,
    status: "BREACHED",
    startedAt: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
    dueAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    escalationCount: 2
  },
  {
    id: "sla_pmsma_01",
    stepId: "step_03",
    patientName: "Meena Bai",
    patientPhone: "+91 98261 23453",
    category: "PMSMA_VISIT",
    targetFacility: "PHC Sirmour",
    slaWindowHours: 720,
    hoursElapsed: 120,
    status: "ON_TRACK",
    startedAt: new Date(Date.now() - 120 * 3600 * 1000).toISOString(),
    dueAt: new Date(Date.now() + 600 * 3600 * 1000).toISOString(),
  }
];

const dispatchedInterventions = [
  {
    id: "int_01",
    type: "DLT_SMS_HINDI",
    receiver: "+91 98261 23451",
    patientName: "Sunita Devi",
    templateId: "DLT-MP-HRP-REF-101",
    channel: "TELECOM_DLT_SMS",
    status: "DELIVERED",
    message: "सुनीता जी, आपकी ज़िला अस्पताल रीवा की जाँच 14 सितंबर को देय है। कृपया समय पर पहुँचें। सहायता हेतु आशा कमला देवी से संपर्क करें (9827011223)। - स्वास्थ्य विभाग",
    dispatchedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  },
  {
    id: "int_02",
    type: "WHATSAPP_ASHA_NUDGE",
    receiver: "+91 98270 11224",
    ashaName: "Shanti Bai",
    patientName: "Rekha Kumari",
    channel: "WHATSAPP_BUSINESS_API",
    status: "ACKNOWLEDGED",
    message: "⚠️ CCE अलर्ट: रेखा कुमारी (घरौंदा) को मेडिकल कॉलेज जबलपुर रेफर किया गया था, लेकिन 72 घंटे में आगमन दर्ज नहीं हुआ। कृपया गृह भेंट कर कारण जानें।",
    dispatchedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
  },
  {
    id: "int_03",
    type: "SUPERVISORY_MO_ALERT",
    receiver: "dr.sirmour@mp.gov.in",
    channel: "PHC_MO_INSIGHTS_API",
    status: "DELIVERED",
    message: "High-Risk Pregnancy referral breach (>72h) escalated for Sub-centre Ghurehta. Patient: Rekha Kumari. Severe Anemia (Hb 7.2).",
    dispatchedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  }
];

const cceMetrics = {
  totalCloudEventsIngested: 142,
  activeSlaClocks: activeSlas.length,
  breachesDetected: 1,
  smsDispatched: 138,
  whatsAppNudgesDispatched: 24,
  loopClosureRateWithCCE: "86.4%",
  loopClosureRateWithoutCCE: "41.8%",
  avgTimeToClosureWithCCE: "3.2 days",
  avgTimeToClosureWithoutCCE: "48.6 days",
  lostToFollowUpReduction: "82%"
};

const server = http.createServer((req, res) => {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split("?")[0];

  // 1) Health Check
  if (req.method === "GET" && (url === "/health" || url === "/v1/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
      status: "UP", 
      service: "openphc-cce-suite-mock",
      modules: {
        collector: "ONLINE",
        compliance: "ONLINE",
        intelligence: "ONLINE",
        adaptors: "ONLINE"
      }
    }));
    return;
  }

  // 2) Event Ingestion (cce-collector-service: POST /v1/events)
  if (req.method === "POST" && url === "/v1/events") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const cloudEvent = JSON.parse(body);

        // Validate CloudEvents v1.0 standard envelope
        if (!cloudEvent.specversion || !cloudEvent.id || !cloudEvent.source || !cloudEvent.type || !cloudEvent.data) {
          res.writeHead(422, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid CloudEvents v1.0 envelope: missing required attributes" }));
          return;
        }

        eventLog.unshift({
          receivedAt: new Date().toISOString(),
          event: cloudEvent,
        });

        cceMetrics.totalCloudEventsIngested++;

        // Trigger CCE Compliance Engine SLA evaluation on ingestion
        if (cloudEvent.type === "org.openphc.task.created") {
          activeSlas.unshift({
            id: `sla_${Date.now()}`,
            stepId: cloudEvent.data.id || `step_${Date.now()}`,
            patientName: cloudEvent.data.patientName || "Pregnant Woman",
            patientPhone: cloudEvent.data.patientPhone || "+91 98261 44102",
            category: cloudEvent.data.code || "REFERRAL",
            targetFacility: cloudEvent.data.targetFacilityName || "Public Facility",
            slaWindowHours: cloudEvent.data.code === "REFERRAL" ? 72 : 336,
            hoursElapsed: 0,
            status: "ON_TRACK",
            startedAt: new Date().toISOString(),
            dueAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString()
          });
        }

        console.log(`\x1b[32m[CCE Collector Ingested]\x1b[0m ${cloudEvent.type} | Subject: ${cloudEvent.subject} | ID: ${cloudEvent.id}`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "ACCEPTED",
          eventId: cloudEvent.id,
          cceProtocolInstanceId: `prot_${Date.now()}`,
          complianceTracking: "INITIALIZED",
          receivedAt: new Date().toISOString(),
        }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Malformed JSON payload in request body" }));
      }
    });
    return;
  }

  // 3) Event Log Query
  if (req.method === "GET" && url === "/v1/events") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ count: eventLog.length, events: eventLog }));
    return;
  }

  // 4) Compliance Service: Active SLAs (GET /v1/compliance/slas)
  if (req.method === "GET" && url === "/v1/compliance/slas") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ activeSlas, total: activeSlas.length }));
    return;
  }

  // 5) Compliance Service: Trigger Sweep (POST /v1/compliance/evaluate-sweep)
  if (req.method === "POST" && url === "/v1/compliance/evaluate-sweep") {
    // Advance simulated time & check breaches
    activeSlas.forEach((sla) => {
      sla.hoursElapsed += 24;
      if (sla.hoursElapsed > sla.slaWindowHours) {
        sla.status = "BREACHED";
      }
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "SWEEP_COMPLETE",
      evaluatedAt: new Date().toISOString(),
      activeSlasCount: activeSlas.length,
      breachesCount: activeSlas.filter(s => s.status === "BREACHED").length
    }));
    return;
  }

  // 6) Intelligence Service: Dispatches & Interventions (GET /v1/intelligence/dispatches)
  if (req.method === "GET" && url === "/v1/intelligence/dispatches") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ dispatches: dispatchedInterventions, total: dispatchedInterventions.length }));
    return;
  }

  // 7) CCE Metrics & Impact Comparison (GET /v1/cce/metrics)
  if (req.method === "GET" && url === "/v1/cce/metrics") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(cceMetrics));
    return;
  }

  // 8) Live Simulation Scenario Trigger (POST /v1/cce/simulate-scenario)
  if (req.method === "POST" && url === "/v1/cce/simulate-scenario") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      let scenario = "SLA_BREACH";
      try {
        if (body) {
          const parsed = JSON.parse(body);
          if (parsed.scenario) scenario = parsed.scenario;
        }
      } catch (e) {}

      if (scenario === "SLA_BREACH") {
        // Trigger automated breach & intelligence routing
        const newBreach = {
          id: `sla_breach_${Date.now()}`,
          stepId: `step_sim_${Date.now()}`,
          patientName: "Gita Sharma",
          patientPhone: "+91 98261 23455",
          category: "REFERRAL",
          targetFacility: "District Hospital, Rewa",
          slaWindowHours: 72,
          hoursElapsed: 76,
          status: "BREACHED",
          startedAt: new Date(Date.now() - 76 * 3600 * 1000).toISOString(),
          dueAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
          escalationCount: 1
        };
        activeSlas.unshift(newBreach);

        const newNudge = {
          id: `int_${Date.now()}`,
          type: "WHATSAPP_ASHA_NUDGE",
          receiver: "+91 98270 11223",
          ashaName: "Kamla Devi",
          patientName: "Gita Sharma",
          channel: "WHATSAPP_BUSINESS_API",
          status: "DELIVERED",
          message: "⚠️ CCE इंटेलिजेंस अलर्ट: गीता शर्मा (घुराहटा) की 72 घंटे की रेफरल अवधि समाप्त हो गई है। कृपया तुरंत गृह भेंट करें।",
          dispatchedAt: new Date().toISOString()
        };
        dispatchedInterventions.unshift(newNudge);
        cceMetrics.breachesDetected++;
        cceMetrics.whatsAppNudgesDispatched++;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "SIMULATION_SUCCESS",
          scenario: "SLA_BREACH",
          breach: newBreach,
          interventionDispatched: newNudge
        }));
        return;
      }

      if (scenario === "LOOP_CLOSED") {
        // Hospital arrival confirmation
        const targetSla = activeSlas.find(s => s.status === "BREACHED" || s.status === "ON_TRACK");
        if (targetSla) {
          targetSla.status = "COMPLETED_CLOSED_LOOP";
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "SIMULATION_SUCCESS",
          scenario: "LOOP_CLOSED",
          message: "District Hospital Rewa confirmed patient arrival. CCE halted escalation SLA clock."
        }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "SIMULATION_RESET" }));
    });
    return;
  }

  // Fallback 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint Not Found", availableEndpoints: ["/v1/events", "/v1/compliance/slas", "/v1/intelligence/dispatches", "/v1/cce/metrics", "/v1/health"] }));
});

server.listen(PORT, () => {
  console.log(`\x1b[34m========================================================================\x1b[0m`);
  console.log(`\x1b[1m  OpenPHC Care Coordination Engine (CCE) Local Mock running on port ${PORT}\x1b[0m`);
  console.log(`  • Collector Ingestion (CloudEvents v1.0): POST http://localhost:${PORT}/v1/events`);
  console.log(`  • Compliance SLA Monitor (72h Tracking):   GET  http://localhost:${PORT}/v1/compliance/slas`);
  console.log(`  • Intelligence Adaptors (SMS/WhatsApp):   GET  http://localhost:${PORT}/v1/intelligence/dispatches`);
  console.log(`  • CCE Closed-Loop Analytics:               GET  http://localhost:${PORT}/v1/cce/metrics`);
  console.log(`  • Interactive Scenario Simulation:         POST http://localhost:${PORT}/v1/cce/simulate-scenario`);
  console.log(`\x1b[34m========================================================================\x1b[0m`);
});
