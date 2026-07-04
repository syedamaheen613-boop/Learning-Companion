---
name: Sarvam STT audio format
description: Browser WebM/OGG audio is rejected by Sarvam STT; must be converted to WAV first.
---

**Rule:** Always convert browser-recorded audio to 16-bit mono 16 kHz WAV via ffmpeg before sending to the Sarvam `speech-to-text` endpoint.

**Why:** Sarvam's STT API claims WebM support but returns "Failed to read the file, please check the audio format" (HTTP 400) for browser-native WebM/Opus blobs. WAV is the most reliable format.

**How to apply:** In `sarvam_voice.py`, `_to_wav()` runs `ffmpeg -ar 16000 -ac 1 -sample_fmt s16` on all non-WAV/MP3/M4A/FLAC/AAC inputs. The temp file is deleted after the API call. If ffmpeg fails, fall back to sending original file.

Also use `saaras:v2` (not `v3`) — v3 was also unreliable during testing.
