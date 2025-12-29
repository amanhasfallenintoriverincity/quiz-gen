import os
import json
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
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
        "message": "Welcome to the AI Quiz API (5 Questions, 5 API Calls)",
        "endpoints": {
            "quiz": "/quiz/<topic>"
        }
    })

@app.route('/quiz/<topic>')
def get_quiz(topic):
    REQUIRED_COUNT = 5
    result_questions = []
    
    # 1. Fetch available questions from DB
    available_questions = Question.query.filter(
        Question.topic == topic,
        Question.usage_count < 5
    ).order_by(Question.usage_count.asc()).limit(REQUIRED_COUNT).all()
    
    # Add existing questions to result
    for q in available_questions:
        q.usage_count += 1
        result_questions.append({
            "source": "database",
            "id": q.id,
            "quiz": q.data
        })
    
    # 2. If we need more questions, generate them individually
    needed_count = REQUIRED_COUNT - len(result_questions)
    
    # STRICT RULE: 1 Question = 1 API Call
    # We loop 'needed_count' times
    for _ in range(needed_count):
        print(f"Generating question {_ + 1} of {needed_count} via Gemini API...")
        q_data = generate_single_quiz_question(topic)
        
        if q_data:
            new_q = Question(
                topic=topic,
                data=q_data,
                usage_count=1
            )
            db.session.add(new_q)
            db.session.flush() # Get ID
            
            result_questions.append({
                "source": "ai_generated",
                "id": new_q.id,
                "quiz": q_data
            })
        else:
            # Handle failure gracefully? Or just skip
            pass
            
    db.session.commit()
    
    return jsonify({
        "topic": topic,
        "count": len(result_questions),
        "questions": result_questions
    })

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)