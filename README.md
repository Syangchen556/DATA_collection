# Multi-View BSL Data Collector

A Vercel-ready three-phone recorder for synchronized front, left, and right sign-language video. MediaPipe runs on each phone and extracts hand, pose, and face landmarks while the browser records the original video.

## Vercel setup

1. Import this repository into Vercel.
2. In the Vercel project, create and connect a **private Vercel Blob** store.
3. From the Vercel Marketplace, create and connect an **Upstash Redis** database.
4. Confirm these environment variables exist:

```text
BLOB_READ_WRITE_TOKEN
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

The Vercel Upstash integration may instead inject `KV_REST_API_URL` and
`KV_REST_API_TOKEN`; the application supports both naming schemes.

5. Deploy. Vercel supplies HTTPS, so phone browsers can request camera permission.

For local development, copy `.env.example` to `.env.local`, supply development credentials, run `npm install`, then `npm run dev`.

## Collection workflow

1. Enter participant ID, session ID, gloss, and take.
2. Open the control room and scan its QR code on three phones.
3. Assign exactly one phone to each of Front, Left, and Right.
4. Grant camera permission and wait until all positions are ready.
5. Start the synchronized five-second countdown, perform the sign, and stop the take.
6. Each phone uploads directly to private Blob storage. Failed uploads remain in that phone's IndexedDB and can be retried.

## Output structure

```text
captures/P001/S001/hello/T001/
  P001_S001_hello_T001_front.webm
  P001_S001_hello_T001_front_landmarks.json
  P001_S001_hello_T001_left.webm
  P001_S001_hello_T001_left_landmarks.json
  P001_S001_hello_T001_right.webm
  P001_S001_hello_T001_right_landmarks.json
```

Session records expire after 24 hours. Each session uses separate cryptographically random controller and phone tokens. Start commands are bound to one take and phones reject signals arriving more than 1.5 seconds late.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Keep phone browsers visible and devices awake. For frame-level verification, clap once after recording starts. Obtain informed participant consent and establish a retention policy before collecting identifiable video.
