# NaFT IEEE ClimateChain 2026 — Automated real-browser video capture

This repository can now capture the **real publicly deployed NaFT application** in a headless Chromium session. It does **not** generate a fake screen, fabricate Etherscan transactions, sign blockchain transactions, or upload footage to Devpost automatically.

## Quick start in GitHub Actions (recommended for ChatGPT Work)

1. Open **Actions → IEEE NaFT Demo Video Capture** in the **independent IEEE repository**.
2. Select **Run workflow → main**.
3. Choose **preview** first. This captures all eight actions in a short 1080p silent MP4; verify output/artifact before proceeding.
4. Select **full** for the final ~4 minute 10 second recording. Leave **open_etherscan** OFF by default for consistent recording; the actual on-app verified P1/P2 transaction links are shown. Turn it ON only if you need the external Etherscan page included and can accept an unreachable-site fallback.
5. Open the successful **workflow run → Artifacts** and download the ZIP. It contains **NaFT_IEEE_ClimateChain_Demo_2026.mp4** and **NaFT_IEEE_recording_manifest.json**.
6. Watch the video and verify legibility, scroll pacing and proof links. Add English voiceover and subtitles using the [existing four-minute narration script](climatechain-video-script.md).
7. Upload the reviewed final video to a publicly accessible or organizer-accepted unlisted video host, then paste that confirmed URL into Devpost.

**ChatGPT Work instruction:** Navigate to the repository's GitHub Actions UI, run the `IEEE NaFT Demo Video Capture` workflow with `mode=preview`, inspect the artifact and, if acceptable, run `mode=full`. Download the resulting artifact ZIP and prepare editing notes. Do not claim that the video was made unless the workflow run succeeded and the MP4 artifact is available. Work can navigate the cloud browser; the repository's GitHub Action does the recording/transcoding independently of Work screen-recording support.

## Recording implementation

- `scripts/record-ieee-demo.mjs`: Playwright with 1920×1080 Chromium `recordVideo` captures real, sequenced browser interaction.
- `.github/workflows/record-ieee-demo.yml`: installs Playwright Chromium and FFmpeg, records video, transcodes to 30fps H.264 MP4 without an audio track, checks resolution/duration and uploads an artifact.
- `NAFT_VIDEO_MODE=preview|full` (default: preview). `NAFT_VIDEO_EXPLORER=1` optionally tests opening *real* Etherscan P2 data during a full recording. If Etherscan blocks bots/loads incorrectly, the recorder returns to the real NaFT proof display without falsely asserting success.
- `video-output/` is intentionally ignored by Git. Recording runs against the **live HTTPS GitHub Pages URL**, not fake fixtures.
- No `secrets.*`, GitHub write token, blockchain wallet, external paid service or AWS credentials needed. Public UI only.

Eight scenes, full target seconds: **25, 25, 45, 30, 50, 30, 30, 15 = 250 seconds**.

1. Logo and concept.
2. Synthetic aggregator scenario.
3. Run real 100-claim methodology update (100/30/70/15/15).
4. Select synthetic CLIMATE-086 and expand the dependency explanation.
5. Prepare local anchor arguments, show verified public P1/P2 links. The button **does not broadcast** any chain transaction.
6. Architecture diagram and trust boundary.
7. The 614 synthetic adversarial test cases and bounded zero-FN finding.
8. Final live NaFT logo.

**Research boundaries:** 100 synthetic claims are NOT 100 farms. The 30/70 split is an illustrative fixture, NOT a measured 70% reduction in verification costs or time. Ethereum Sepolia witnesses **package hash parentage**, not environmental truth, formal certification, credit issuance, registry acceptance or measured emissions reductions.

## Local execution (for Work with a real terminal)

Node.js 24+, Playwright Chromium and FFmpeg are required:

```sh
npm install --no-save --no-package-lock --ignore-scripts playwright@1.56.1
npx playwright install chromium
NAFT_VIDEO_MODE=preview node scripts/record-ieee-demo.mjs
ffmpeg -y -i video-output/NaFT_IEEE_ClimateChain_raw.webm -an \
  -vf 'fps=30,format=yuv420p' -c:v libx264 -crf 24 -movflags +faststart \
  video-output/NaFT_IEEE_ClimateChain_Demo_2026.mp4
```

Use `NAFT_VIDEO_MODE=full` after a successful preview. Keep credentials off-screen and avoid recording an authenticated browser session.

## Scope and limitations

- Audio is intentionally **not** synthesized. Add the ElevenLabs narration afterward. The MP4 is a *silent recording*.
- Headless Chromium/remote rendering can vary in font/layout from a local browser; visually review the artifact.
- The optional live Etherscan page may present anti-bot protection or fail, so it is not guaranteed.
- Video/artifacts live in GitHub Actions for a limited retention period (14 days); they are **not** uploaded to Devpost or made anonymously downloadable by this workflow.
- Workflow artifacts and final Devpost requirements must be verified by the user. No auto-submission is performed.
