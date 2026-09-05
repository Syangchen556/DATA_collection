# TriCapture — three-phone MediaPipe dataset recorder

TriCapture records synchronized `front`, `left`, and `right` phone videos and extracts MediaPipe hand, pose, and face landmarks. One QR code joins all phones to the same session. The controller issues a shared start timestamp, and every phone uploads a systematically named video plus landmark JSON.

## Data layout

```text
captures/{participant}/{session}/{sign}/{take}/
  P001_S001_hello_T001_front.webm
  P001_S001_hello_T001_front_landmarks.json
  P001_S001_hello_T001_left.webm
  P001_S001_hello_T001_left_landmarks.json
  P001_S001_hello_T001_right.webm
  P001_S001_hello_T001_right_landmarks.json
```

The landmark file includes session metadata, device ID, actual start time, duration, frame count, timestamps, and MediaPipe hand/pose/face landmarks.

## Run

```powershell
npm install
npm run dev
```

Open the printed controller URL on the computer. Camera access on phones requires a secure origin. The easiest choices are the deployed HTTPS URL or an HTTPS tunnel pointed at port 3000. Plain `http://<computer-ip>:3000` usually cannot request phone-camera permission.

## Collection workflow

1. Enter participant, session, gloss, and take on the home page.
2. Open the control room and scan its one QR code with all three phones.
3. Assign exactly one phone each to Front, Left, and Right.
4. On each phone, choose its physical camera, grant permission, and wait for Ready.
5. Press **Start all**, perform the sign after the countdown, then press **Stop & upload**.
6. Wait until all three positions show `complete` before changing take or sign.

For tighter offline alignment, clap once after recording begins. Each device stores both wall-clock and elapsed timestamps.

## Important operational notes

- Keep each phone awake and the browser page visible during a take.
- Use stable Wi-Fi and upload after short takes; large videos may exceed hosting upload limits.
- MediaPipe models load from Google storage and the WebAssembly runtime loads from jsDelivr on first use.
- Obtain informed consent and define a retention policy before collecting identifiable videos.
