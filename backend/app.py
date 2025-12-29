import os
import json
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from google import genai
from pydantic import BaseModel, Field

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
# Assumes GEMINI_API_KEY is in environment variables
client = genai.Client()

# Pydantic model for structured output
class QuizQuestion(BaseModel):
    question: str = Field(description="The quiz question text")
    options: list[str] = Field(description="A list of 4 possible answers")
    answer: str = Field(description="The correct answer (must be one of the options)")
    explanation: str = Field(description="A short explanation of why the answer is correct")

def generate_quiz_question(topic):
    """Generates a quiz question using Gemini API."""
    try:
        prompt = f"Create a unique and challenging multiple-choice question about {topic}."
        
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
        "message": "Welcome to the AI Quiz API",
        "endpoints": {
            "quiz": "/quiz/<topic>"
        }
    })

@app.route('/quiz/<topic>')
def get_quiz(topic):
    # 1. Check DB for questions with usage < 5
    existing_question = Question.query.filter(
        Question.topic == topic,
        Question.usage_count < 5
    ).order_by(Question.usage_count.asc()).first()

    if existing_question:
        existing_question.usage_count += 1
        db.session.commit()
        return jsonify({
            "source": "database",
            "id": existing_question.id,
            "usage_count": existing_question.usage_count,
            "quiz": existing_question.data
        })

    # 2. Generate new question
    quiz_data = generate_quiz_question(topic)
    
    if not quiz_data:
        return jsonify({"error": "Failed to generate quiz question"}), 500

    # Save to database
    new_question = Question(
        topic=topic,
        data=quiz_data,
        usage_count=1
    )
    db.session.add(new_question)
    db.session.commit()

    return jsonify({
        "source": "ai_generated",
        "id": new_question.id,
        "usage_count": new_question.usage_count,
        "quiz": new_question.data
    })

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
