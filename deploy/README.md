# EC2 Deployment Guide: Next Steps & OpenPHC CCE Mock

This guide covers deploying the **Next Steps Care Coordination Application** and the **OpenPHC CCE Mock Microservices** to your AWS EC2 instance (`13.232.251.63`) under the Medtronic LABS domain (`nextsteps.mdtlabs.org`).

---

## 1. Domain Recommendation for Raghu / IT

Send the following email to Raghu and your IT/DevOps team:

```text
Subject: DNS Configuration Request for Next Steps & CCE Demo (13.232.251.63)

Hi Raghu & DevOps Team,

Please create an A-record for the Next Steps Frontline Care Coordination & CCE deployment:

• Subdomain: nextsteps.mdtlabs.org
• Record Type: A
• Target IP: 13.232.251.63
• TTL: 300 seconds

We will configure Nginx with Certbot (or Caddy) to handle automatic HTTPS for both the web application and the CCE Collector API (/v1/*) under this unified subdomain.

Thank you,
Sumit
```

---

## 2. Architecture on EC2

```
                       Internet
                          |
              https://nextsteps.mdtlabs.org
                          |
                          v
         +----------------------------------+
         |     Nginx / Caddy (Port 443)     |
         |         (Let's Encrypt)          |
         +----------------------------------+
                 /                  \
                /                    \
       [ /v1/* Reverse Proxy ]   [ /* Static SPA ]
              |                           |
              v                           v
     +-----------------+         +-----------------+
     | CCE Mock Server |         |  Vite React App |
     | (systemd :8080) |         | (/var/www/.../dist)
     +-----------------+         +-----------------+
```

---

## 3. Quick 1-Command Deployment on EC2

SSH into your EC2 instance:
```bash
ssh -i "$env:USERPROFILE\.ssh\id_ed25519" ubuntu@13.232.251.63
```

Then run the automated setup script:
```bash
curl -fsSL https://raw.githubusercontent.com/Medtronic-LABS/Next-Steps/dev/deploy/setup-ec2.sh | bash
```

Or clone and run:
```bash
git clone -b dev https://github.com/Medtronic-LABS/Next-Steps.git
chmod +x Next-Steps/deploy/setup-ec2.sh
./Next-Steps/deploy/setup-ec2.sh nextsteps.mdtlabs.org
```

---

## 4. Enabling HTTPS with Certbot (Once DNS is mapped)

Once Raghu confirms `nextsteps.mdtlabs.org` points to `13.232.251.63`, run:

```bash
sudo certbot --nginx -d nextsteps.mdtlabs.org
```

---

## 5. Connecting the Android App to the Hosted CCE

In the Android mobile application:
1. Open the app and tap **`CCE Cockpit`** in the header.
2. Navigate to Tab 4 (**`Outbox Queue`**).
3. Set the Collector URL to:
   ```text
   https://nextsteps.mdtlabs.org/v1/events
   ```
4. Now any referral created or confirmed on the physical Android phone automatically syncs with the live hosted CCE engine!
