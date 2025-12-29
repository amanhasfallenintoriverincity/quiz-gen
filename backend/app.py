import os
import json
import random
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql.expression import func
from google import genai
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask
app = Flask(__name__)

# Configuration
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'quiz.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize Database
db = SQLAlchemy(app)

# Database Model
class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    topic = db.Column(db.String(100), nullable=False)
    data = db.Column(db.JSON, nullable=False)
    usage_count = db.Column(db.Integer, default=0)

# Gemini Client
client = genai.Client()

# Pydantic model for structured output
class QuizQuestion(BaseModel):
    question: str = Field(description="The quiz question text")
    options: list[str] = Field(description="A list of 4 possible answers")
    answer: str = Field(description="The correct answer (must be one of the options)")
    explanation: str = Field(description="A short explanation of why the answer is correct")

def generate_single_quiz_question(topic):
    """Generates EXACTLY ONE quiz question using one Gemini API call."""
    try:
        prompt = (
            f"Create ONE unique multiple-choice question about '{topic}'. "
            "STRICT CONSTRAINT: The question must be related to either: "
            "1. The 'Information' (정보) school subject curriculum. "
            "2. Artificial Intelligence (AI) concepts and ethics. "
            "Difficulty: Suitable for students. "
            "Output language: Korean."
        )
        
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': QuizQuestion,
            },
        )
        
        if response.parsed:
            return response.parsed.model_dump()
        elif response.text:
            return json.loads(response.text)
        else:
            return None
            
    except Exception as e:
        print(f"Error generating quiz: {e}")
        return None

# Routes
@app.route('/')
def index():
    return jsonify({
        "status": "ok",
        "message": "Welcome to the AI Quiz API (Random Selection + Auto-Growth)",
        "endpoints": {
            "quiz": "/quiz"
        }
    })

@app.route('/quiz')
def get_quiz():
    TOPIC_KEY = "Information_Subject_AI"
    DISPLAY_TOPIC = "정보 교과 및 인공지능 (Information Subject & AI)"
    REQUIRED_COUNT = 5
    
    # 1. Fetch 5 Random questions from DB (regardless of usage_count)
    # SQLite uses func.random(), PostgreSQL uses func.random(), MySQL uses func.rand()
    # SQLAlchemy's func.random() usually maps correctly for SQLite.
    result_db_questions = Question.query.filter(
        Question.topic == TOPIC_KEY
    ).order_by(func.random()).limit(REQUIRED_COUNT).all()
    
    result_data = []
    
    # Add fetched questions to response list
    for q in result_db_questions:
        q.usage_count += 1
        result_data.append({
            "source": "database",
            "id": q.id,
            "quiz": q.data
        })

    # 2. Logic to add new questions periodically or if not enough exist
    # Condition A: If we retrieved fewer than 5 questions, we MUST generate more to fill the gap.
    # Condition B: Even if we have 5, with 30% chance, generate 1 new question to grow the DB pool.
    
    needed_count = REQUIRED_COUNT - len(result_data)
    
    # If we have enough questions, check probability to add a new one anyway (Growth)
    if needed_count == 0 and random.random() < 0.3:
        print("Triggering random AI generation to grow database pool...")
        needed_count = 1
        # Note: We won't necessarily append this to the *current response* if we already have 5,
        # unless you want the user to see the brand new one immediately. 
        # Let's replace one random existing question with the new one for freshness, 
        # or just add it to DB silently. 
        # Strategy: Add it to DB. If we are just growing, we don't strictly need to return it, 
        # but returning it ensures the user sees new content. Let's append/replace.
        # However, for simplicity, I'll just add it to the DB.
        
        # Actually, to make the code simpler: 
        # I will generate 'needed_count' (gap filler) normally.
        # PLUS, I will run a separate single generation step if the probability hits, 
        # but only save it to DB, not necessarily affecting the response count unless needed.
    
    # Let's stick to: "Ensure we return 5". If we generated extra for growth, we save them.
    
    questions_to_generate = needed_count
    
    # If gap is 0, maybe generate 1 for growth
    is_growth_generation = False
    if questions_to_generate == 0 and random.random() < 0.3:
        questions_to_generate = 1
        is_growth_generation = True

    newly_generated_items = []

    for _ in range(questions_to_generate):
        print("Generating new question via AI...")
        q_data = generate_single_quiz_question(DISPLAY_TOPIC)
        
        if q_data:
            new_q = Question(
                topic=TOPIC_KEY,
                data=q_data,
                usage_count=0 # New question
            )
            db.session.add(new_q)
            db.session.flush() # Get ID
            
            item = {
                "source": "ai_generated",
                "id": new_q.id,
                "quiz": q_data
            }
            
            # If this was strictly needed to fill the quota, add to results
            # If it was growth, we can choose to swap it in or just let it sit in DB.
            # Let's swap it in to show the user the new content immediately!
            if is_growth_generation:
                if len(result_data) >= REQUIRED_COUNT:
                    result_data.pop() # Remove one old one
                result_data.append(item)
            else:
                result_data.append(item)
    
    db.session.commit()
    
    # Ensure we limit to 5 just in case logic got messy
    final_response = result_data[:REQUIRED_COUNT]

    return jsonify({
        "topic": TOPIC_KEY,
        "count": len(final_response),
        "questions": final_response
    })

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)