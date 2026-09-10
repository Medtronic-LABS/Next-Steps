# EC2 Multi-Domain Deployment: Next Steps & OpenPHC CCE Mock

This guide covers deploying the **Next Steps Care Coordination Web App** and the **OpenPHC CCE Mock Engine** to the shared AWS EC2 instance (`13.232.251.63`), running safely alongside the existing `vda-admin.mdtlabs.org` and `vda-api.mdtlabs.org` services.

---

## 1. Domain Request Email for Raghu / IT

Since the server already hosts `vda-admin` and `vda-api`, follow the exact same naming convention:

```text
Subject: Subdomain DNS Mapping for Next Steps & CCE Demo (13.232.251.63)

Hi Raghu,

Following up on your recommendation for https and subdomains, could you please map the following subdomains for the Next Steps frontline care coordination prototype and CCE engine?

1. Web Portal:
   • Subdomain: nextsteps.mdtlabs.org (or nextsteps-admin.mdtlabs.org)
   • Record Type: A
   • Target IP: 13.232.251.63

2. CCE Engine API:
   • Subdomain: nextsteps-api.mdtlabs.org
   • Record Type: A
   • Target IP: 13.232.251.63

We have configured an isolated Nginx virtual host with Certbot on the EC2 instance so it runs cleanly alongside the existing vda-admin and vda-api domains without any port or routing conflicts.

Thank you,
Sumit
```

> **Note**: If IT prefers creating only **one** subdomain instead of two, `nextsteps.mdtlabs.org` alone is also fully supported! Nginx automatically routes `/` to the web app and `/v1/` to the CCE API under that single subdomain.

---

## 2. Server Architecture on EC2 (`13.232.251.63`)

Nginx routes traffic based on the HTTP `Host` header, keeping all projects completely isolated:

```
                            EC2 (13.232.251.63)
                                     |
               +---------------------+---------------------+
               |                     |                     |
     vda-admin.mdtlabs.org   vda-api.mdtlabs.org   nextsteps.mdtlabs.org / nextsteps-api
       (Existing VDA UI)     (Existing VDA API)           |
                                                          +--> /     -> /var/www/next-steps/dist (Vite)
                                                          +--> /v1/* -> 127.0.0.1:8088 (CCE Mock)
```

- **CCE Mock Port**: `8088` (Isolated from VDA's backend ports)
- **Nginx Config**: `/etc/nginx/sites-available/nextsteps.conf` (Does not modify any `vda*` configurations)
- **Reload**: Uses `nginx -t && systemctl reload nginx` (Zero downtime for existing VDA services)

---

## 3. Deploying via EC2 Terminal (Step-by-Step)

In your active SSH terminal (`ubuntu@13.232.251.63`), run the following:

### Step A: Check Active Ports
```bash
sudo ss -tulpn | grep LISTEN
```
*(Confirms what ports VDA uses so 8088 is completely free).*

### Step B: Run the Setup Script
```bash
curl -fsSL https://raw.githubusercontent.com/Medtronic-LABS/Next-Steps/dev/deploy/setup-ec2.sh | bash
```

Or execute manually:
```bash
# Clone or pull the dev branch
sudo git clone -b dev https://github.com/Medtronic-LABS/Next-Steps.git /var/www/next-steps || (cd /var/www/next-steps && sudo git pull origin dev)
sudo chown -R ubuntu:ubuntu /var/www/next-steps
cd /var/www/next-steps

# Install and build
npm install
npm run build

# Run deployment script
chmod +x deploy/setup-ec2.sh
./deploy/setup-ec2.sh nextsteps.mdtlabs.org nextsteps-api.mdtlabs.org
```

---

## 4. Activating HTTPS via Certbot (After DNS is Configured)

Once Raghu or IT confirms the DNS records are live:

```bash
sudo certbot --nginx -d nextsteps.mdtlabs.org -d nextsteps-api.mdtlabs.org
```
*(Certbot will issue and attach SSL certificates specifically for Next Steps without touching VDA's SSL certificates).*

---

## 5. Mobile App Integration

In the compiled Android APK on the phone:
1. Open **Next Steps** and tap **`CCE Cockpit`** in the header.
2. Go to **`Outbox Queue`** (Tab 4).
3. The app comes pre-configured with `https://nextsteps.mdtlabs.org/v1/events` (or `https://nextsteps-api.mdtlabs.org/v1/events`).
4. Tap **Test Ping** to confirm live cloud round-trip!

