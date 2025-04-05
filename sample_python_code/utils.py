import re

def validate_email(email):
    """Validate that an email is in the correct format"""
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if not re.match(pattern, email):
        raise ValueError("Invalid email format")
    return True

def sanitize_content(content):
    """Remove any potentially harmful content"""
    # Simplified for example purposes
    sanitized = content.replace("<script>", "")
    return sanitized

def generate_slug(text):
    """Generate a URL-friendly slug from text"""
    return text.lower().replace(" ", "-")