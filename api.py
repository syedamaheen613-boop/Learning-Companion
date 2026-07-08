"""
api.py — Learning Companion Flask API
"""

import os
import random
import uuid
from datetime import date, timedelta

import certifi

os.environ["SSL_CERT_FILE"] = certifi.where()

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from neo4j import GraphDatabase
from dotenv import load_dotenv
from llm_tutor import (
    ask_claude,
    generate_challenge_questions,
    get_hint,
    get_correct_answer,
    evaluate_answer,
)

load_dotenv()

URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER")
PASSWORD = os.getenv("NEO4J_PASSWORD")

app = Flask(__name__)
CORS(app)
driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))


# ── core graph helpers ────────────────────────────────────────────────────────


def ensure_concept_exists(concept_name: str, subject: str = "General"):
    """Auto-create a Concept node if it doesn't exist yet."""
    query = """
    MERGE (c:Concept {name: $concept_name})
    ON CREATE SET c.subject = $subject
    RETURN c
    """
    with driver.session() as session:
        session.run(query, concept_name=concept_name, subject=subject)


def find_connection_to_past_mistake(student_id: str, new_concept_name: str):
    direct_query = """
    MATCH (s:Student {id:$student_id})-[:MADE]->(m:Mistake)-[:ABOUT]->(c:Concept {name:$new_concept_name})
    RETURN c.name AS newTopic, c.name AS connectedWeakness, m.description AS pastMistake
    """
    indirect_query = """
    MATCH (s:Student {id:$student_id})-[:MADE]->(m:Mistake)-[:ABOUT]->(weak:Concept)
    MATCH (new:Concept {name:$new_concept_name})-[:DEPENDS_ON*1..3]->(weak)
    RETURN new.name AS newTopic, weak.name AS connectedWeakness, m.description AS pastMistake
    """
    with driver.session() as session:
        direct = [
            dict(r)
            for r in session.run(
                direct_query, student_id=student_id, new_concept_name=new_concept_name
            )
        ]
        if direct:
            return direct
        return [
            dict(r)
            for r in session.run(
                indirect_query, student_id=student_id, new_concept_name=new_concept_name
            )
        ]


def ensure_student_exists(student_id: str):
    """Auto-create a Student node if it doesn't exist yet."""
    query = """
    MERGE (s:Student {id: $student_id})
    ON CREATE SET s.name = $student_id, s.created = date()
    RETURN s
    """
    with driver.session() as session:
        session.run(query, student_id=student_id)


def log_new_mistake(student_id: str, concept_name: str, description: str):
    # Ensure concept exists
    with driver.session() as session:
        session.run("MERGE (c:Concept {name: $name})", name=concept_name)
        session.run(
            """
            MATCH (s:Student {id:$student_id})
            MATCH (c:Concept {name:$concept_name})
            CREATE (m:Mistake {description:$description, date: date()})
            CREATE (s)-[:MADE]->(m)
            CREATE (m)-[:ABOUT]->(c)
        """,
            student_id=student_id,
            concept_name=concept_name,
            description=description,
        )


def get_full_graph_for_student(student_id: str):
    query = """
    MATCH (s:Student {id:$student_id})
    OPTIONAL MATCH (s)-[:MADE]->(m:Mistake)-[:ABOUT]->(c:Concept)
    OPTIONAL MATCH (c)-[:DEPENDS_ON]->(dep:Concept)
    RETURN s.name AS student, m.description AS mistake, c.name AS concept, dep.name AS dependsOn
    """
    with driver.session() as session:
        return [dict(r) for r in session.run(query, student_id=student_id)]


def get_all_concept_names():
    with driver.session() as session:
        return [
            r["name"] for r in session.run("MATCH (c:Concept) RETURN c.name AS name")
        ]


# ── XP / streak / badge helpers ───────────────────────────────────────────────


def compute_xp(mistake_count: int, concept_count: int) -> int:
    return mistake_count * 10 + concept_count * 25


def compute_streak(dates: list) -> int:
    """Count consecutive-day streak. Allows streak from yesterday (still active today)."""
    parsed = set()
    for d in dates:
        if d:
            try:
                parsed.add(date.fromisoformat(str(d)))
            except Exception:
                pass
    if not parsed:
        return 0

    today = date.today()
    yesterday = today - timedelta(days=1)

    # Start counting from today if active today, else from yesterday
    if today in parsed:
        start = today
    elif yesterday in parsed:
        start = yesterday
    else:
        return 0

    streak, current = 0, start
    while current in parsed:
        streak += 1
        current -= timedelta(days=1)
    return streak


BADGES = [
    {
        "id": "first_step",
        "name": "First Step",
        "description": "Logged your first mistake",
        "icon": "🚀",
        "threshold": {"mistakes": 1},
    },
    {
        "id": "mistake_logger",
        "name": "Mistake Logger",
        "description": "Logged 3 mistakes",
        "icon": "📝",
        "threshold": {"mistakes": 3},
    },
    {
        "id": "deep_learner",
        "name": "Deep Learner",
        "description": "Logged 10 mistakes",
        "icon": "🧠",
        "threshold": {"mistakes": 10},
    },
    {
        "id": "multi_concept",
        "name": "Multi-Concept",
        "description": "Struggled with 3+ concepts",
        "icon": "🗺️",
        "threshold": {"concepts": 3},
    },
    {
        "id": "scholar",
        "name": "Scholar",
        "description": "Earned 100 XP",
        "icon": "🎓",
        "threshold": {"xp": 100},
    },
    {
        "id": "streak_3",
        "name": "On a Roll",
        "description": "3-day study streak",
        "icon": "🔥",
        "threshold": {"streak": 3},
    },
    {
        "id": "streak_7",
        "name": "Week Warrior",
        "description": "7-day study streak",
        "icon": "⚡",
        "threshold": {"streak": 7},
    },
]


# ── voice helpers ─────────────────────────────────────────────────────────────

from sarvam_voice import speech_to_text, text_to_speech, translate_to_english


def extract_known_concept(text: str, known_concepts: list):
    text_lower = text.lower()
    for concept in known_concepts:
        if concept.lower() in text_lower:
            return concept
    return None


# ── routes ────────────────────────────────────────────────────────────────────


@app.route("/api/healthz")
def healthz():
    return jsonify({"status": "ok"})


@app.route("/api/")
def home():
    return jsonify({"status": "ok", "message": "Learning companion API is running"})


# ── student management ────────────────────────────────────────────────────────


@app.route("/api/students", methods=["GET"])
def list_students():
    with driver.session() as session:
        rows = [
            {"id": r["id"], "name": r["name"]}
            for r in session.run(
                "MATCH (s:Student) RETURN s.id AS id, s.name AS name ORDER BY s.name"
            )
        ]
    return jsonify({"students": rows})


@app.route("/api/create_student", methods=["POST"])
def create_student():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    student_id = data.get("student_id", "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    if not student_id:
        # auto-generate from name
        student_id = name.lower().replace(" ", "_") + "_" + str(uuid.uuid4())[:4]
    # Sanitise
    student_id = student_id.lower().replace(" ", "_")
    with driver.session() as session:
        session.run(
            """
            MERGE (s:Student {id: $sid})
            ON CREATE SET s.name = $name
            ON MATCH  SET s.name = $name
        """,
            sid=student_id,
            name=name,
        )
    return jsonify({"status": "created", "student_id": student_id, "name": name})


# ── ask (text) ────────────────────────────────────────────────────────────────


@app.route("/api/ask", methods=["GET"])
def ask():
    student_id = request.args.get("student_id")
    topic = request.args.get("topic")
    if not student_id or not topic:
        return jsonify({"error": "student_id and topic are required"}), 400

    ensure_student_exists(student_id)
    ensure_concept_exists(topic)

    connections = find_connection_to_past_mistake(student_id, topic)
    try:
        reply = ask_claude(topic, connections[0] if connections else None)
    except Exception:
        reply = f"{topic} is an interesting topic! Keep exploring it."

    return jsonify({"topic": topic, "reply": reply, "connections": connections})

@app.route("/api/ask_voice", methods=["POST"])
def ask_voice():
    student_id = request.form.get("student_id")
    audio_file = request.files.get("audio")
    if not student_id or not audio_file:
        return jsonify({"error": "student_id and audio are required"}), 400

    try:
        ext = os.path.splitext(audio_file.filename or "q.webm")[1] or ".webm"
        temp_input_path = f"temp_question_{uuid.uuid4().hex}{ext}"
        audio_file.save(temp_input_path)
        # STT
        try:
            transcribed_text = speech_to_text(temp_input_path)
        except Exception as stt_err:
            os.remove(temp_input_path)
            return jsonify(
                {
                    "error": f"Speech recognition failed: {stt_err}. Please speak clearly and try again."
                }
            ), 500

        # Translation (best-effort)
        try:
            translated_text = translate_to_english(transcribed_text)
        except Exception:
            translated_text = transcribed_text

        # Topic matching
        matched_topic = extract_known_concept(translated_text, get_all_concept_names())

        if not matched_topic:
            reply_text = (
                f"I heard you say: '{transcribed_text}'. "
                f"I couldn't match that to a specific topic in your knowledge graph. "
                f"Try asking about one of your study concepts like Recursion, Arrays, or Merge Sort."
            )
            connections = []
        else:
            connections = find_connection_to_past_mistake(student_id, matched_topic)
            reply_text = ask_claude(
                matched_topic, connections[0] if connections else None
            )

        # TTS (best-effort — don't fail the whole request if TTS breaks)
        tts_ok = False
        try:
            text_to_speech(reply_text, output_path="reply_output.wav")
            tts_ok = True
        except Exception as tts_err:
            print(f"TTS failed (non-fatal): {tts_err}")

        # Cleanup
        try:
            os.remove(temp_input_path)
        except Exception:
            pass

        return jsonify(
            {
                "transcribed_question": transcribed_text,
                "translated_question": translated_text,
                "matched_topic": matched_topic,
                "reply_text": reply_text,
                "reply_audio_path": "reply_output.wav" if tts_ok else None,
                "connections": connections,
            }
        )

    except Exception as e:
        return jsonify(
            {
                "error": str(e),
                "transcribed_question": "",
                "reply_text": f"Processing error: {e}",
            }
        ), 500


@app.route("/api/audio", methods=["GET"])
def serve_audio():
    audio_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "reply_output.wav"
    )
    if not os.path.exists(audio_path):
        return jsonify({"error": "No audio file found"}), 404
    return send_file(audio_path, mimetype="audio/wav", as_attachment=False)


# ── mistake logging ───────────────────────────────────────────────────────────


@app.route("/api/log_mistake", methods=["POST"])
def log_mistake():
    data = request.get_json() or {}
    student_id = data.get("student_id")
    concept = data.get("concept")
    description = data.get("description")
    if not all([student_id, concept, description]):
        return jsonify(
            {"error": "student_id, concept, and description are required"}
        ), 400
    ensure_student_exists(student_id)
    log_new_mistake(student_id, concept, description)
    return jsonify({"status": "logged"})


# ── graph ─────────────────────────────────────────────────────────────────────


@app.route("/api/graph", methods=["GET"])
def graph():
    student_id = request.args.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400
    return jsonify({"graph": get_full_graph_for_student(student_id)})


# ── dashboard ─────────────────────────────────────────────────────────────────


@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    student_id = request.args.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400

    ensure_student_exists(student_id)

    with driver.session() as session:
        row = session.run(
            """
            MATCH (s:Student {id: $sid})
            OPTIONAL MATCH (s)-[:MADE]->(m:Mistake)-[:ABOUT]->(c:Concept)
            RETURN s.id AS student_id, s.name AS name,
                   count(m)           AS mistake_count,
                   count(DISTINCT c)  AS concept_count,
                   collect({description: m.description, concept: c.name, date: toString(m.date)}) AS activity
        """,
            sid=student_id,
        ).single()

    if not row:
        return jsonify({"error": "Student not found"}), 404

    activity = [r for r in row["activity"] if r.get("description")]
    xp = compute_xp(row["mistake_count"], row["concept_count"])
    streak = compute_streak([r["date"] for r in activity if r.get("date")])

    concept_map = {}
    for item in activity:
        cn = item.get("concept")
        if cn:
            concept_map.setdefault(cn, []).append(item["description"])

    mastery = [
        {
            "concept": c,
            "mistake_count": len(ms),
            "status": "struggling"
            if len(ms) >= 3
            else "needs_review"
            if len(ms) >= 1
            else "mastered",
        }
        for c, ms in concept_map.items()
    ]
    recent = sorted(
        [r for r in activity if r.get("date")], key=lambda x: x["date"], reverse=True
    )[:5]

    return jsonify(
        {
            "student_id": row["student_id"],
            "name": row["name"] or student_id,
            "xp": xp,
            "streak": streak,
            "mistake_count": row["mistake_count"],
            "concept_count": row["concept_count"],
            "mastery": mastery,
            "recent_activity": recent,
        }
    )


# ── leaderboard ───────────────────────────────────────────────────────────────


@app.route("/api/leaderboard", methods=["GET"])
def leaderboard():
    with driver.session() as session:
        rows = []
        for r in session.run("""
            MATCH (s:Student)
            OPTIONAL MATCH (s)-[:MADE]->(m:Mistake)-[:ABOUT]->(c:Concept)
            RETURN s.id AS student_id, s.name AS name,
                   count(m)          AS mistake_count,
                   count(DISTINCT c) AS concept_count,
                   collect(toString(m.date)) AS dates
        """):
            xp = compute_xp(r["mistake_count"], r["concept_count"])
            streak = compute_streak(r["dates"])
            rows.append(
                {
                    "student_id": r["student_id"],
                    "name": r["name"] or r["student_id"],
                    "xp": xp,
                    "streak": streak,
                    "mistake_count": r["mistake_count"],
                    "concept_count": r["concept_count"],
                }
            )

    rows.sort(key=lambda x: x["xp"], reverse=True)
    for i, row in enumerate(rows):
        row["rank"] = i + 1
    return jsonify({"leaderboard": rows})


# ── study plan ────────────────────────────────────────────────────────────────


@app.route("/api/study_plan", methods=["GET"])
def study_plan():
    student_id = request.args.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400

    with driver.session() as session:
        plan = []
        for r in session.run(
            """
            MATCH (s:Student {id: $sid})-[:MADE]->(m:Mistake)-[:ABOUT]->(c:Concept)
            OPTIONAL MATCH (c)-[:DEPENDS_ON*1..3]->(dep:Concept)
            RETURN c.name AS concept, count(DISTINCT m) AS mistake_count,
                   collect(DISTINCT dep.name) AS dependencies,
                   collect(m.description)[0]  AS sample_mistake
            ORDER BY mistake_count DESC
        """,
            sid=student_id,
        ):
            deps = [d for d in r["dependencies"] if d]
            effort = "high" if len(deps) >= 3 else "medium" if deps else "low"
            plan.append(
                {
                    "rank": len(plan) + 1,
                    "concept": r["concept"],
                    "mistake_count": r["mistake_count"],
                    "effort": effort,
                    "sample_mistake": r["sample_mistake"],
                    "dependencies": deps,
                }
            )

    return jsonify({"study_plan": plan, "student_id": student_id})


# ── challenge mode ────────────────────────────────────────────────────────────


@app.route("/api/challenge", methods=["GET"])
def challenge():
    student_id = request.args.get("student_id")
    try:
        count = min(10, max(3, int(request.args.get("count", 5))))
    except (TypeError, ValueError):
        count = 5
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400

    with driver.session() as session:
        concepts = [
            r["concept"]
            for r in session.run(
                """
            MATCH (s:Student {id: $sid})-[:MADE]->(m:Mistake)-[:ABOUT]->(c:Concept)
            RETURN c.name AS concept, count(m) AS cnt
            ORDER BY cnt DESC LIMIT 5
        """,
                sid=student_id,
            )
        ]

    if not concepts:
        return jsonify(
            {"error": "No weak concepts found. Log some mistakes first!"}
        ), 404

    # Round-robin generation across top weak concepts to guarantee exactly `count` questions.
    top_concepts = concepts[: min(3, len(concepts))]
    all_questions: list[dict] = []
    idx = 0
    while len(all_questions) < count:
        concept = top_concepts[idx % len(top_concepts)]
        # Fetch one extra question per concept per round (avoids generating tiny batches)
        batch_size = max(2, count // len(top_concepts) + 1)
        if len(all_questions) == 0 or concept != all_questions[-1].get("concept"):
            qs = generate_challenge_questions(concept, batch_size)
            all_questions.extend(qs)
        idx += 1
        if idx > count * len(top_concepts):  # safety valve
            break

    random.shuffle(all_questions)
    questions = all_questions[:count]
    for i, q in enumerate(questions):
        q["id"] = i

    return jsonify(
        {"questions": questions, "student_id": student_id, "total": len(questions)}
    )


@app.route("/api/challenge/hint", methods=["POST"])
def challenge_hint():
    data = request.get_json() or {}
    question = data.get("question", "")
    concept = data.get("concept", "")
    if not question:
        return jsonify({"error": "question is required"}), 400
    hint = get_hint(question, concept)
    return jsonify({"hint": hint})


@app.route("/api/challenge/submit", methods=["POST"])
def challenge_submit():
    data = request.get_json() or {}
    concept = data.get("concept", "")
    question = data.get("question", "")
    answer = data.get("answer", "")
    if not answer:
        return jsonify({"error": "answer is required"}), 400

    result = evaluate_answer(question, concept, answer)
    result["concept"] = concept
    return jsonify(result)


# ── badges ────────────────────────────────────────────────────────────────────


@app.route("/api/badges", methods=["GET"])
def badges():
    student_id = request.args.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400

    with driver.session() as session:
        row = session.run(
            """
            MATCH (s:Student {id: $sid})
            OPTIONAL MATCH (s)-[:MADE]->(m:Mistake)-[:ABOUT]->(c:Concept)
            RETURN count(m) AS mistake_count, count(DISTINCT c) AS concept_count,
                   collect(toString(m.date)) AS dates
        """,
            sid=student_id,
        ).single()

    mc, cc = (row["mistake_count"], row["concept_count"]) if row else (0, 0)
    xp = compute_xp(mc, cc)
    streak = compute_streak(row["dates"] if row else [])
    stats = {"mistakes": mc, "concepts": cc, "xp": xp, "streak": streak}

    result_badges = [
        {**b, "unlocked": all(stats.get(k, 0) >= v for k, v in b["threshold"].items())}
        for b in BADGES
    ]
    return jsonify({"badges": result_badges, "student_id": student_id})


# ── entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=False)
