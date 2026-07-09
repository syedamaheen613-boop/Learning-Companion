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

# 🎓 Learning Companion — Sys.V1

> An AI-powered adaptive learning platform that remembers **why** a student struggles, not just **what** they studied.

---

## 🚀 Features

- 🎤 Multilingual Voice Support (English, Hindi, Kannada)
- 🧠 AI Tutor powered by Claude
- 📊 Personalized Study Plans
- 🔗 Graph-based Memory using Neo4j
- 🏆 Challenge Mode
- 🎖️ Achievement Badges
- 📈 Leaderboard
- 👤 Per-student learning history

---

# 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Python + Flask | Backend |
| React + Vite | Frontend |
| Neo4j AuraDB | Graph Database |
| Claude API | AI Tutor |
| Sarvam AI | Speech-to-Text & Text-to-Speech |

---

# 📂 Project Structure

```
Learning-Companion/
│
├── backend/
├── artifacts/
│   └── demo-ui/
├── api.py
├── llm_tutor.py
├── sarvam_voice.py
├── README.md
└── .env.example
```

---

# ⚙️ Installation

### Clone the repository

```bash
git clone https://github.com/syedamaheen613-boop/Learning-Companion.git
```

### Install Python dependencies

```bash
pip install -r requirements.txt
```

### Install Frontend

```bash
cd artifacts/demo-ui
pnpm install
```

### Configure Environment Variables

Copy

```
.env.example
```

to

```
.env
```

and fill in your API keys.

---

# ▶️ Run the Project

Backend

```bash
python api.py
```

Frontend

```bash
cd artifacts/demo-ui
pnpm dev
```

---

# 🌟 Key Highlights

- Adaptive AI tutoring
- Voice-based interaction
- Personalized concept graph
- Intelligent revision planning
- Real-time progress tracking

---

Live Demo:

https://neo-4-j-voice-ai--syedamaheen613.replit.app


---

# 👩‍💻 Team

- Syeda Maheen f
- Tanmaya S
- Swetha R

---

# 📜 License

This project was built for educational and hackathon purposes.
