# Multi-View BSL Data Collector — laptop storage

The laptop coordinates three phones and stores every recording locally. MediaPipe runs in each phone browser and samples hand and pose landmarks at 2 FPS while the browser records video at its requested 30 FPS. Models are warmed up before a phone reports ready. Face landmark detection is intentionally disabled to prioritize smooth recording and reduce phone workload.

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
data/captures/colors/red/
  red_T001_front.webm
  red_T001_front_landmarks.json
  red_T001_left.webm
  red_T001_left_landmarks.json
  red_T001_right.webm
  red_T001_right_landmarks.json
  red_T002_front.webm
  ...
```

Session coordination files are stored under `data/sessions/`. The entire `data/` directory is excluded from Git.

## Workflow

1. Open the control room on the laptop.
2. Scan the single QR code on three phones.
3. Assign Front, Left, and Right to separate phones and grant camera permission.
4. Wait until all three phones are ready.
5. In the control room, enter the sign/gloss and take name and select **Prepare recording**.
6. Choose the recording duration and start the shared five-second countdown.
7. All phones stop automatically at the same scheduled deadline and upload their video and MediaPipe JSON through the tunnel to the laptop. Use **Stop early** only when a take must be cancelled early.
8. Change the sign or take name, select **Prepare recording**, and record again. The three phones remain connected and reuse their open cameras and loaded MediaPipe models, so the QR code only needs to be scanned once per collection session.

### Folder-based naming queue

The control room reads category and recording names from `collection_names/`.
Each immediate child folder is a category, and its child folders are the available
recording names. Use the category selector and Previous/Next buttons to fill the
sign name, then select **Prepare recording**. The included queues are colors,
fruits, weekdays, and numbers 10–20.

Failed uploads remain in that phone's IndexedDB and can be retried. Keep the laptop server running, phones awake, and browser pages visible until all views show complete.

## Verify

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```
