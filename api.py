"""
api.py

A small Flask API that wraps the graph_memory.py logic, so a UI
or voice pipeline (Sarvam AI) can call it over HTTP instead of
running Python scripts manually.

Run with: python api.py
Then test with: curl "http://localhost:5000/ask?student_id=student_1&topic=Merge%20Sort"
"""

import os
import certifi

os.environ["SSL_CERT_FILE"] = certifi.where()

from flask import Flask, request, jsonify
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER")
PASSWORD = os.getenv("NEO4J_PASSWORD")

app = Flask(__name__)
driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))


def find_connection_to_past_mistake(student_id: str, new_concept_name: str):
    query = """
    MATCH (s:Student {id:$student_id})-[:MADE]->(m:Mistake)-[:ABOUT]->(weak:Concept)
    MATCH (new:Concept {name:$new_concept_name})-[:DEPENDS_ON*1..3]->(weak)
    RETURN new.name AS newTopic, weak.name AS connectedWeakness, m.description AS pastMistake
    """
    with driver.session() as session:
        result = session.run(query, student_id=student_id, new_concept_name=new_concept_name)
        return [dict(record) for record in result]


def log_new_mistake(student_id: str, concept_name: str, description: str):
    query = """
    MATCH (s:Student {id:$student_id})
    MATCH (c:Concept {name:$concept_name})
    CREATE (m:Mistake {description:$description, date: date()})
    CREATE (s)-[:MADE]->(m)
    CREATE (m)-[:ABOUT]->(c)
    """
    with driver.session() as session:
        session.run(query, student_id=student_id, concept_name=concept_name, description=description)


def get_full_graph_for_student(student_id: str):
    query = """
    MATCH (s:Student {id:$student_id})
    OPTIONAL MATCH (s)-[:MADE]->(m:Mistake)-[:ABOUT]->(c:Concept)
    OPTIONAL MATCH (c)-[:DEPENDS_ON]->(dep:Concept)
    RETURN s.name AS student, m.description AS mistake, c.name AS concept, dep.name AS dependsOn
    """
    with driver.session() as session:
        result = session.run(query, student_id=student_id)
        return [dict(record) for record in result]


@app.route("/")
def home():
    return jsonify({"status": "ok", "message": "Learning companion API is running"})


@app.route("/ask", methods=["GET"])
def ask():
    """
    Main 'wow moment' endpoint.
    Example: GET /ask?student_id=student_1&topic=Merge Sort
    """
    student_id = request.args.get("student_id")
    topic = request.args.get("topic")

    if not student_id or not topic:
        return jsonify({"error": "student_id and topic are required"}), 400

    connections = find_connection_to_past_mistake(student_id, topic)

    if connections:
        c = connections[0]
        reply = (
            f"This connects to something you struggled with before: "
            f"{c['connectedWeakness']} — specifically, {c['pastMistake']}."
        )
    else:
        reply = f"No past connection found for {topic}. This looks like a fresh topic for you."

    return jsonify({
        "topic": topic,
        "reply": reply,
        "connections": connections
    })


@app.route("/log_mistake", methods=["POST"])
def log_mistake():
    """
    Write-back endpoint. After a session, call this to record a new mistake.
    Example body (JSON): {"student_id": "student_1", "concept": "Joins", "description": "Mixed up INNER and LEFT join"}
    """
    data = request.get_json()
    student_id = data.get("student_id")
    concept = data.get("concept")
    description = data.get("description")

    if not all([student_id, concept, description]):
        return jsonify({"error": "student_id, concept, and description are required"}), 400

    log_new_mistake(student_id, concept, description)
    return jsonify({"status": "logged"})


@app.route("/graph", methods=["GET"])
def graph():
    """
    Returns the full graph for a student, used to render the visual concept map.
    Example: GET /graph?student_id=student_1
    """
    student_id = request.args.get("student_id")
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400

    data = get_full_graph_for_student(student_id)
    return jsonify({"graph": data})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)