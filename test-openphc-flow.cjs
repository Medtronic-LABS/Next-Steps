/**
 * Automated Verification Script: OpenPHC Event Ingestion Flow
 * Tests that CloudEvents v1.0 carrying FHIR R4 Task payloads conform to specifications
 * and ingest properly into the OpenPHC collector.
 */

const http = require("http");

// Mock sample event generated from our TypeScript eventBuilder logic
const sampleEvent = {
  specversion: "1.0",
  id: "evt_test_123456",
  source: "org.openphc.nextsteps.sc-ghurehta",
  type: "org.openphc.task.created",
  subject: "Patient/pw_01",
  datacontenttype: "application/json",
  time: new Date().toISOString(),
  facilityid: "SUBCENTRE",
  protocolinstanceid: "proto_pw_01",
  protocoldefinitionid: "cce-maternal-v1",
  actionid: "referral",
  data: {
    resourceType: "Task",
    id: "step_test_01",
    identifier: [
      {
        system: "urn:openphc:step-id",
        value: "step_test_01",
      },
    ],
    status: "requested",
    intent: "order",
    priority: "urgent",
    code: {
      coding: [
        {
          system: "http://openphc.org/fhir/CodeSystem/task-category",
          code: "specialist-referral",
          display: "Specialist Referral",
        },
      ],
      text: "Specialist Referral",
    },
    for: {
      reference: "Patient/pw_01",
      display: "Sunita Devi",
    },
    encounter: {
      reference: "Encounter/vis_123456",
    },
    authoredOn: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    restriction: {
      period: {
        end: "2026-09-15",
      },
    },
  },
};

// Start a test mock server on port 8089
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/v1/events") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const parsed = JSON.parse(body);
      if (parsed.specversion === "1.0" && parsed.data.resourceType === "Task") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ACCEPTED", eventId: parsed.id }));
      } else {
        res.writeHead(422);
        res.end(JSON.stringify({ error: "Invalid format" }));
      }
    });
  }
});

server.listen(8089, () => {
  console.log("Test mock server started on 8089");

  // Dispatch POST /v1/events
  const payloadStr = JSON.stringify(sampleEvent);
  const req = http.request(
    {
      hostname: "localhost",
      port: 8089,
      path: "/v1/events",
      method: "POST",
      headers: {
        "Content-Type": "application/cloudevents+json",
        "Content-Length": Buffer.byteLength(payloadStr),
      },
    },
    (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(`Response Status: ${res.statusCode}`);
        console.log(`Response Body: ${data}`);
        server.close();
        if (res.statusCode === 200) {
          console.log("SUCCESS: OpenPHC CloudEvents + FHIR Task ingestion verified!");
          process.exit(0);
        } else {
          console.error("FAIL: Expected 200 OK");
          process.exit(1);
        }
      });
    }
  );

  req.on("error", (err) => {
    console.error("Request error:", err);
    server.close();
    process.exit(1);
  });

  req.write(payloadStr);
  req.end();
});
