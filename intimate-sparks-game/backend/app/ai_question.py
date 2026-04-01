import random

def generate_ai_question(mood: str, relationship_type: str):
    romantic = [
        "What's a small moment we shared that you replay in your mind?",
        "Describe the first time you realized you were falling for me."
    ]
    flirty = [
        "What's something about my appearance that distracts you?",
        "Describe a fantasy date you'd love to take me on."
    ]
    bold = [
        "What's something you've imagined us doing that you haven't told me?",
        "Describe the most adventurous place you'd want to kiss me."
    ]
    if mood == "romantic":
        templates = romantic
        level = 1
    elif mood == "flirty":
        templates = flirty
        level = 2
    else:
        templates = bold
        level = 3
    return {
        "type": "truth",
        "level": level,
        "text": random.choice(templates),
        "ai_generated": True
    }
