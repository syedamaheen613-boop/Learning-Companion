import os
import certifi

# Permanent fix for SSL certificate issues
os.environ["SSL_CERT_FILE"] = certifi.where()

from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER")
PASSWORD = os.getenv("NEO4J_PASSWORD")


class GraphMemory:
    def __init__(self):
        self.driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

    def close(self):
        self.driver.close()

    def find_connection_to_past_mistake(self, student_id: str, new_concept_name: str):
        query = """
        MATCH (s:Student {id:$student_id})-[:MADE]->(m:Mistake)-[:ABOUT]->(weak:Concept)
        MATCH (new:Concept {name:$new_concept_name})-[:DEPENDS_ON*1..3]->(weak)
        RETURN new.name AS newTopic, weak.name AS connectedWeakness, m.description AS pastMistake
        """
        with self.driver.session() as session:
            result = session.run(query, student_id=student_id, new_concept_name=new_concept_name)
            return [dict(record) for record in result]

    def log_new_mistake(self, student_id: str, concept_name: str, description: str):
        query = """
        MATCH (s:Student {id:$student_id})
        MATCH (c:Concept {name:$concept_name})
        CREATE (m:Mistake {description:$description, date: date()})
        CREATE (s)-[:MADE]->(m)
        CREATE (m)-[:ABOUT]->(c)
        RETURN m
        """
        with self.driver.session() as session:
            session.run(query, student_id=student_id, concept_name=concept_name, description=description)

    def get_full_graph_for_student(self, student_id: str):
        query = """
        MATCH (s:Student {id:$student_id})
        OPTIONAL MATCH (s)-[:MADE]->(m:Mistake)-[:ABOUT]->(c:Concept)
        OPTIONAL MATCH (c)-[:DEPENDS_ON]->(dep:Concept)
        RETURN s, m, c, dep
        """
        with self.driver.session() as session:
            result = session.run(query, student_id=student_id)
            return [record.data() for record in result]


if __name__ == "__main__":
    gm = GraphMemory()
    print("Checking connection and running the wow-moment query...\n")
    results = gm.find_connection_to_past_mistake("student_1", "Merge Sort")
    if results:
        for r in results:
            print(f"New topic: {r['newTopic']}")
            print(f"Connects to weakness: {r['connectedWeakness']}")
            print(f"Past mistake: {r['pastMistake']}")
    else:
        print("No connection found — check your seed data or student_id.")
    gm.close()