"""
sarvam_voice.py

Integration with Sarvam AI for speech-to-text and text-to-speech.

Audio conversion note: Sarvam STT reliably accepts WAV (pcm_s16le) but
often rejects browser-native WebM/OGG. We convert all audio to WAV with
ffmpeg before sending. This is transparent to the caller.
"""

import base64
import os
import subprocess
import tempfile

import requests

SARVAM_API_KEY  = os.getenv("SARVAM_API_KEY")
SARVAM_BASE_URL = "https://api.sarvam.ai"

# Formats that Sarvam STT accepts natively (no conversion needed)
_SARVAM_NATIVE = {".wav", ".mp3", ".m4a", ".flac", ".aac"}


def _to_wav(src_path: str) -> tuple[str, bool]:
    """
    Convert *src_path* to a temporary 16-bit mono 16 kHz WAV file using
    ffmpeg. Returns (wav_path, is_temp) so the caller can clean up.
    If the source is already a supported format, return it as-is with
    is_temp=False.
    """
    ext = os.path.splitext(src_path)[1].lower()
    if ext in _SARVAM_NATIVE:
        return src_path, False

    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()
    wav_path = tmp.name

    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", src_path,
                "-ar", "16000",
                "-ac", "1",
                "-sample_fmt", "s16",
                wav_path,
            ],
            capture_output=True,
            timeout=30,
        )
        if result.returncode != 0:
            # If conversion fails, try sending the original and let Sarvam
            # return a more informative error.
            os.unlink(wav_path)
            return src_path, False
    except Exception:
        try:
            os.unlink(wav_path)
        except OSError:
            pass
        return src_path, False

    return wav_path, True


def speech_to_text(audio_file_path: str, language_code: str = "unknown") -> str:
    """
    Transcribe *audio_file_path* via Sarvam STT (saaras:v3).
    Input can be any audio format supported by ffmpeg.
    language_code='unknown' triggers Sarvam auto language-detection.
    """
    if not SARVAM_API_KEY:
        raise RuntimeError("SARVAM_API_KEY environment variable is not set.")

    wav_path, is_temp = _to_wav(audio_file_path)
    try:
        url     = f"{SARVAM_BASE_URL}/speech-to-text"
        headers = {"api-subscription-key": SARVAM_API_KEY}
        with open(wav_path, "rb") as f:
            files = {"file": (os.path.basename(wav_path), f, "audio/wav")}
            data  = {
                "model": "saaras:v2",
                "language_code": language_code,
                "mode": "transcribe",
            }
            response = requests.post(url, headers=headers, files=files, data=data, timeout=30)

        if response.status_code != 200:
            print("SARVAM STT ERROR:", response.status_code, response.text[:300])

        response.raise_for_status()
        return response.json().get("transcript", "")
    finally:
        if is_temp:
            try:
                os.unlink(wav_path)
            except OSError:
                pass


def text_to_speech(text: str, language_code: str = "en-IN", output_path: str = "reply.wav") -> str:
    """
    Convert *text* to speech via Sarvam TTS (bulbul:v2) and save to
    *output_path* as a WAV file. Returns the output path.
    Truncates to 500 chars to stay within API limits.
    """
    if not SARVAM_API_KEY:
        raise RuntimeError("SARVAM_API_KEY environment variable is not set.")

    url     = f"{SARVAM_BASE_URL}/text-to-speech"
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": [text[:500]],
        "target_language_code": language_code,
        "model": "bulbul:v2",
        "speaker": "shubh",
    }

    response = requests.post(url, headers=headers, json=payload, timeout=30)

    if response.status_code != 200:
        print("SARVAM TTS ERROR:", response.status_code, response.text[:300])

    response.raise_for_status()
    result = response.json()

    audio_base64 = result["audios"][0]
    audio_bytes  = base64.b64decode(audio_base64)

    with open(output_path, "wb") as f:
        f.write(audio_bytes)

    return output_path


def translate_to_english(text: str, source_language_code: str = "auto") -> str:
    """
    Translate *text* to English (en-IN) using Sarvam's mayura:v1 model.
    Falls back to the original text on any error.
    """
    if not SARVAM_API_KEY or not text.strip():
        return text

    url     = f"{SARVAM_BASE_URL}/translate"
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "input": text,
        "source_language_code": source_language_code,
        "target_language_code": "en-IN",
        "model": "mayura:v1",
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code != 200:
            return text
        return response.json().get("translated_text", text)
    except Exception:
        return text


if __name__ == "__main__":
    print("Testing text-to-speech…")
    path = text_to_speech(
        "This connects to something you struggled with before — recursion.",
        language_code="en-IN",
        output_path="test_reply.wav",
    )
    print(f"Audio saved to: {path}")
