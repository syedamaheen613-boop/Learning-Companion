# Python Backend

Plain Python backend for Neo4j integration and Sarvam AI voice features.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # fill in your credentials
python main.py
```

## Structure

- `main.py` — entry point
- `requirements.txt` — Python dependencies
- `.env.example` — environment variable template (copy to `.env` and fill in values)
