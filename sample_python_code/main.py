import utils
from models import User, Post
from database import Database

def initialize_app():
    """Initialize the application components"""
    db = Database()
    db.connect()
    return db

def create_user(username, email):
    """Create a new user in the system"""
    db = initialize_app()
    user = User(username, email)
    utils.validate_email(email)
    db.save(user)
    return user

def create_post(user, title, content):
    """Create a new post by a user"""
    db = initialize_app()
    post = Post(user, title, content)
    utils.sanitize_content(content)
    db.save(post)
    return post

if __name__ == "__main__":
    db = initialize_app()
    user = create_user("johndoe", "john@example.com")
    post = create_post(user, "Hello World", "This is my first post!")
    print(f"Created post: {post.title} by {user.username}")