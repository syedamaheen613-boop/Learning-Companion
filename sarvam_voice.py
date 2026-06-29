
import os
import requests
import base64

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_BASE_URL = "https://api.sarvam.ai"


def speech_to_text(audio_file_path: str, language_code: str = "unknown") -> str:
    """
    Sends an audio file to Sarvam's speech-to-text API and returns the
    transcribed text. language_code="unknown" lets Sarvam auto-detect
    the spoken language (e.g. Kannada, Hindi, English).
    """
    url = f"{SARVAM_BASE_URL}/speech-to-text"
    headers = {"api-subscription-key": SARVAM_API_KEY}

    with open(audio_file_path, "rb") as f:
        files = {"file": f}
        data = {
            "model": "saaras:v3",
            "language_code": language_code,
            "mode": "transcribe",
        }
        response = requests.post(url, headers=headers, files=files, data=data)

    response.raise_for_status()
    result = response.json()
    return result.get("transcript", "")


def text_to_speech(text: str, language_code: str = "en-IN", output_path: str = "reply.wav") -> str:
    """
    Sends text to Sarvam's text-to-speech API and saves the resulting
    audio to output_path. Returns the path to the saved audio file.
    """
    url = f"{SARVAM_BASE_URL}/text-to-speech"
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": [text],
        "target_language_code": language_code,
        "model": "bulbul:v3",
        "speaker": "shubh",
    }

    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    result = response.json()

    # Sarvam returns base64-encoded audio in "audios"
    audio_base64 = result["audios"][0]
    audio_bytes = base64.b64decode(audio_base64)

    with open(output_path, "wb") as f:
        f.write(audio_bytes)

    return output_path


if __name__ == "__main__":
    # Quick standalone test for text-to-speech only
    # (speech-to-text needs an actual audio file to test with)
    print("Testing text-to-speech...")
    path = text_to_speech(
        "This connects to something you struggled with before, recursion.",
        language_code="en-IN",
        output_path="test_reply.wav"
    )
    print(f"Audio saved to: {path}")