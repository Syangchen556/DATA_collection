# Multi-View BSL Data Collector — laptop storage

The laptop coordinates three phones and stores every recording locally. MediaPipe runs in each phone browser and extracts hand and pose landmarks while the browser records video. Face landmark detection is intentionally disabled to reduce loading time and phone workload.

No Redis, Vercel Blob, database, or cloud-storage credentials are required.

## Start the collector

```powershell
npm install
npm run dev:network
```

In a second terminal, expose the local server with an HTTPS tunnel:

```powershell
cloudflared tunnel --protocol http2 --edge-ip-version 4 --url http://localhost:3000
```

The explicit HTTP/2 and IPv4 options avoid QUIC/IPv6 connectivity problems on
networks that restrict Cloudflare Tunnel traffic. A successful connection prints
`Registered tunnel connection`.

Open the generated `https://...trycloudflare.com` address on the laptop. Create a session and scan the displayed QR code on all three phones. The tunnel supplies HTTPS for phone-camera permission; files are written by the application to the laptop.

Always open the control room through the generated HTTPS tunnel address, not
through `localhost`. This ensures that the QR code also contains the phone-accessible
tunnel address. Quick Tunnel addresses change whenever Cloudflared is restarted,
so create a new session and QR code after a restart.

## Output location

```text
data/captures/P001/S001/hello/T001/
  P001_S001_hello_T001_front.webm
  P001_S001_hello_T001_front_landmarks.json
  P001_S001_hello_T001_left.webm
  P001_S001_hello_T001_left_landmarks.json
  P001_S001_hello_T001_right.webm
  P001_S001_hello_T001_right_landmarks.json
```

Session coordination files are stored under `data/sessions/`. The entire `data/` directory is excluded from Git.

## Workflow

1. Enter participant, session, sign/gloss, and take on the laptop.
2. Scan the single QR code on three phones.
3. Assign Front, Left, and Right to separate phones and grant camera permission.
4. Wait until all three phones are ready.
5. Start the shared five-second countdown and record the sign.
6. Stop the take. Each phone uploads its video and MediaPipe JSON through the tunnel to the laptop.

Failed uploads remain in that phone's IndexedDB and can be retried. Keep the laptop server running, phones awake, and browser pages visible until all views show complete.

## Verify

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```
