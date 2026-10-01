# AHCC Remote Connections

Get AHCC data to a phone, another site, or your own tools without putting AHCC on the public internet. A route goes over a VPN, through a TAK server or MQTT broker, or straight out to a service you run (email, webhooks).

## Contents

1. [VPN (web UI)](#vpn)
2. [TAK bridge](#tak)
3. [MQTTS broker and site federation](#mqtts)
4. [Email alerts](#email)
5. [Webhooks](#webhooks)
6. [Meshtastic + TAK](#meshtastic)
7. [RBAC (accounts and roles)](#rbac)
8. [Quick reference](#quickref)

| Goal                                            | Route                           |
| ----------------------------------------------- | ------------------------------- |
| The AHCC map/console on your phone              | [VPN + web UI](#vpn)            |
| Nodes, targets, alerts in iTAK/ATAK/WinTAK      | [TAK bridge](#tak)              |
| Raw JSON for scripts, dashboards, Node-RED      | [MQTTS broker](#mqtts)          |
| Alerts to an inbox, no VPN                      | [Email](#email)                 |
| Events pushed to your own endpoint              | [Webhooks](#webhooks)           |
| A second AHCC site sharing state                | [MQTTS federation](#mqtts)      |

--------------------------------------------------------------------------------
<a id="vpn"></a>
VPN (web UI)
--------------------------------------------------------------------------------

Only the web UI needs a VPN. Use WireGuard, Tailscale, or Netbird. Don't open ports 3000 or 5173 to the internet. The backend listens on all interfaces on port 3000, so block it with the host firewall.

1. Install the VPN on the AHCC host and the phone.
2. Open the UI over the VPN address:
   - Server installed with `scripts/deploy-production.sh`: `https://<vpn-ip>` (nginx on 443 serves the UI and proxies the API).
   - Dev setup (`pnpm AHCC`): Vite serves the UI on 5173 and listens on localhost only. Start it with `--host` to reach it over the VPN, then open `http://<vpn-ip>:5173`. This is plain HTTP; use a production install for anything beyond testing.
3. Sign in as VIEWER or ANALYST (see [RBAC](#rbac)), not ADMIN.
4. Turn on 2FA (Account -> Two-Factor Authentication).

Lock it down

- Encrypt the browser hop. With `deploy-production.sh`, nginx terminates TLS. Without nginx, set HTTPS_KEY_PATH and HTTPS_CERT_PATH (optionally HTTPS_CA_PATH, HTTPS_PASSPHRASE) so the backend serves HTTPS. If either file is missing, the backend logs a warning and falls back to plain HTTP.
- Use the firewall (Config -> Firewall). Set the default policy to DENY and put your VPN's IP range in the allow list. The default policy is ALLOW.
- Lock each VPN device to the AHCC host. In WireGuard, set AllowedIPs to that one host.
- Run AHCC as an unprivileged user (`deploy-production.sh` creates `ahcc` with no sudo). Keep .env at 0600. MQTT, TAK, webhook, and SMTP credentials sit in .env and the database in plain text. User passwords are hashed; TOTP secrets are encrypted with TWO_FACTOR_SECRET_KEY.

--------------------------------------------------------------------------------
<a id="tak"></a>
TAK bridge -> TAK server -> iTAK/ATAK/WinTAK
--------------------------------------------------------------------------------

AHCC turns its events into CoT and sends them to a single TAK server. It can send over UDP, plain TCP, or TLS. Plain TCP and UDP are unencrypted, so keep those on localhost or the VPN. Turn on TLS (set TAK_TLS=true and the cert fields) and AHCC verifies the server's certificate, so that hop is safe to cross the internet.

iTAK can't connect to AHCC directly, so the TAK server sits in the middle. AHCC feeds it locally, and iTAK connects to the server over TLS. That server-to-iTAK hop is the encrypted one that crosses the internet.

Free servers: OpenTAKServer (easiest), FreeTAKServer, TAK Server. The plaintext CoT port is around 8087 or 8088. The TLS streaming port is 8089. Check your server's docs.

1. Install OpenTAKServer on the AHCC host, or on a VPN-only machine.
2. Update the database if you haven't: `pnpm update-db` (from the repo root)
3. Set the bridge in Config -> TAK Bridge (admin only): enable it, protocol TCP, host 127.0.0.1, port 8088. For TLS, turn on TLS and paste the CA, client cert, and key (PEM text or a file path). Save. The `TAK_*` lines in .env are not read; only the UI setting is used.
   Use UDP or TCP. The HTTPS protocol option is not implemented and does not connect.
4. Turn on the streams you want (Config -> TAK Bridge -> Streams).
5. Make an enrol QR or data package on the server for the phone.
6. Add the server in iTAK over the VPN. Use the TLS streaming port.
7. Promote a detection in AHCC. Check that an AHCC-TARGET-* marker shows up.

By default AHCC streams node telemetry, target detections, and the Notice, Alert, and Critical alert levels; Info alerts, command acks, and command results stay off. It also reads CoT coming back and saves those positions as nodes, but it never accepts commands, so you can't control your nodes from iTAK.

Lock it down

- Only the TLS port (8089) faces the internet. Block the plaintext CoT port.
- Require client certs on the server. Revoke lost devices. Use TLS 1.2 or newer and your own certificate, not the installer's sample.
- TLS works over TCP only; UDP is always plaintext. With TLS on, AHCC verifies the server's certificate. `cafile` pins a private CA; `certfile` and `keyfile` add a client cert for mutual TLS. `TAK_TLS_INSECURE=true` turns the check off; don't use it.
- Only connect AHCC to a TAK server you control. It trusts positions it receives.

--------------------------------------------------------------------------------
<a id="mqtts"></a>
MQTTS broker and site federation
--------------------------------------------------------------------------------

Every site connects to one shared broker and publishes its data under `ahcc/<siteId>/`, where siteId is the site's SITE_ID from .env (unique per site). Because each site also subscribes, two sites on the same broker see each other's topics and stay in sync on their own. Messages use QoS 1 by default (set per site; node updates always use QoS 1). To read everything from every site at once, subscribe to `ahcc/#`.

| Topic                        | Payload                                    |
| ---------------------------- | ------------------------------------------ |
| `ahcc/<siteId>/nodes/upsert`      | Node snapshot per heartbeat                |
| `ahcc/<siteId>/inventory/upsert`  | Device: MAC, vendor, RSSI, position        |
| `ahcc/<siteId>/targets/upsert`    | Target lifecycle                           |
| `ahcc/<siteId>/targets/delete`    | `{ targetId }`                             |
| `ahcc/<siteId>/geofences/upsert`  | Geofence upsert                            |
| `ahcc/<siteId>/geofences/delete`  | Geofence removal                           |
| `ahcc/<siteId>/geofences/snapshot`| Full geofence set                          |
| `ahcc/<siteId>/drones/upsert`     | Drone telemetry                            |
| `ahcc/<siteId>/commands/events`   | Command lifecycle                          |
| `ahcc/<siteId>/commands/request`  | Remote command request                     |
| `ahcc/<siteId>/events/<type>`     | Alerts and events. `<type>` is the event name with dots, slashes, and spaces turned into dashes, e.g. `event-alert` |
| `ahcc/<siteId>/chat`              | Operator chat                              |

Mosquitto is the default: tiny, free, and configured through plain passwd and acl files. EMQX Open Source is heavier but adds a web dashboard for managing users. Neither needs clustering.

1. Install Mosquitto on a VPS or the AHCC host. Get a cert with certbot.
2. Set up a listener in /etc/mosquitto/conf.d/ahcc.conf:

       listener 8883
       certfile /etc/mosquitto/certs/fullchain.pem
       keyfile  /etc/mosquitto/certs/privkey.pem
       allow_anonymous false
       password_file /etc/mosquitto/passwd
       acl_file /etc/mosquitto/acl

3. Add one readwrite user per site and a read-only viewer:

       mosquitto_passwd -c /etc/mosquitto/passwd ahcc-alpha
       mosquitto_passwd    /etc/mosquitto/passwd viewer

   In the acl: `ahcc-alpha` gets `readwrite ahcc/#`, `viewer` gets `read ahcc/#`.
4. Open 8883, not 1883. Restart Mosquitto.
5. Point AHCC at it (Config -> MQTT Federation, admin only). Set brokerUrl to `mqtts://host:8883`, a unique clientId, the username and password, and turn tlsEnabled on; with it off the connection is plaintext even with an `mqtts://` URL. Leave caPem empty for a public cert. certPem and keyPem add a client certificate for mutual TLS.

Read the feed with MQTTX or any client:

    mqttx sub -h mqtt.example.com -p 8883 -u viewer -P 'password' -t 'ahcc/#'

To add a second site, give it its own SITE_ID, clientId, and readwrite user. Both sites then share nodes, inventory, targets, geofences, drones, and chat. Each can command the other's serial workers.

Lock it down

- With tlsEnabled on, AHCC verifies the broker's cert. For a private cert, paste its CA into caPem. MQTT_TLS_INSECURE=true turns the check off. Don't use it.
- Only ADMIN accounts can view or change the MQTT settings, including the broker password.
- Set allow_anonymous false. One account per site. Give viewers read-only.
- Use TLS 1.2 or newer. Only AHCC should publish to commands/request. That topic runs commands on your nodes.
- The broker password and certs sit in AHCC's database as plain text. Protect it.

--------------------------------------------------------------------------------
<a id="email"></a>
Email alerts
--------------------------------------------------------------------------------

The simplest route: no VPN, broker, or TAK server. AHCC emails you whenever an alert rule matches.

1. Set the SMTP values in apps/backend/.env, then restart:

       MAIL_ENABLED=true
       MAIL_HOST=smtp.example.com
       MAIL_PORT=587
       MAIL_SECURE=false
       MAIL_USER=alerts@example.com
       MAIL_PASS=app-password
       MAIL_FROM="AHCC <alerts@example.com>"

2. In each alert rule, turn on Email and add recipients.
3. Test with MAIL_PREVIEW=true. It logs instead of sending. Or trigger an event.

Port 587 is STARTTLS. Port 465 needs MAIL_SECURE=true. Never use 25. MAIL_PASS is stored in plain text.

Lock it down

- Use a dedicated sending account with an app password. Not your mailbox password.
- Set up SPF and DKIM on the sending domain. That stops spoofing and spam filtering.
- The emails carry MACs and locations. Keep the recipient list short.

--------------------------------------------------------------------------------
<a id="webhooks"></a>
Webhooks
--------------------------------------------------------------------------------

AHCC POSTs each event as JSON to an endpoint you run. It only dials out. The body has `event`, `eventType`, `rule`, `data` (message, node, MAC, SSID, RSSI, location, `timestamp`), and `payload`. Point it at your own API, Node-RED, n8n, or Home Assistant. Discord and Slack expect their own message format, so put a relay in between.

1. Turn on 2FA for your account first (Account -> Two-Factor Authentication). Creating, editing, and testing webhooks requires it.
2. Open Config -> Webhooks. Add the https URL of your receiver.
3. Set a secret. AHCC signs each POST body with it: `x-webhook-signature` is the hex HMAC-SHA256 of the raw body. Headers `x-webhook-id` and `x-webhook-event` identify the webhook and event. Your receiver checks the signature.
4. Pick the events to send. Add a CA bundle and client cert for mutual TLS.
5. Hit the test button. Check the delivery log.

Lock it down

- Use https URLs. AHCC also accepts http, which sends events unencrypted. It verifies the endpoint's cert by default; the per-webhook Verify TLS toggle turns that off. Leave it on.
- Check the signature on your receiver. The signature has no separate timestamp header; reject deliveries whose `data.timestamp` is old to block replays.
- AHCC doesn't check where the URL points. It can hit your LAN or a cloud metadata address. Any account with 2FA can create its own webhooks; only ADMIN can share one with everyone. Limit 2FA-enabled accounts to people you trust with this.

--------------------------------------------------------------------------------
<a id="meshtastic"></a>
Meshtastic + TAK (LoRa, not internet)
--------------------------------------------------------------------------------

The Meshtastic app's TAK feature carries Meshtastic's own CoT between nodes (positions, chat, markers), not AntiHunter detections, which are plain text frames rather than CoT. It also runs over LoRa, not the internet. To get detections into TAK, use the [TAK bridge](#tak).

--------------------------------------------------------------------------------
<a id="rbac"></a>
RBAC (accounts and roles)
--------------------------------------------------------------------------------

Each account gets one role.

| Role     | Can                                            |
| -------- | ---------------------------------------------- |
| ADMIN    | Everything: users, config, firewall, TAK, MQTT |
| OPERATOR | Run commands, manage targets, geofences, drones|
| ANALYST  | Everything VIEWER can, plus exports            |
| VIEWER   | Read-only map, console, inventory              |

Roles are checked on every API call. Logins, user and firewall changes, app settings, fleet security actions, and exports go to the AuditLog; TAK, MQTT, and webhook changes do not. RBAC covers AHCC accounts only. TAK and broker users have their own logins.

Lock it down

- One account per person. Give the lowest role that fits.
- Require 2FA on ADMIN and on any remote login.
- Keep ADMINs few. Disable accounts instead of sharing them.

--------------------------------------------------------------------------------
<a id="quickref"></a>
Quick reference
--------------------------------------------------------------------------------

| Hop                     | Encrypted by AHCC          | Crosses internet? |
| ----------------------- | -------------------------- | ----------------- |
| Browser -> AHCC UI      | nginx TLS (deploy-production.sh) or HTTPS_* on the backend | VPN only |
| AHCC -> TAK server      | TLS if enabled (TCP only), else none | yes with TLS |
| TAK server -> iTAK      | server's TLS (8089)        | yes               |
| AHCC -> MQTT broker     | yes with tlsEnabled (caPem for private CA) | yes |
| AHCC -> webhook         | TLS for https URLs; HMAC body signature; optional mTLS | yes |
| AHCC -> SMTP server     | STARTTLS/TLS               | yes               |
