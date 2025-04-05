from utils import generate_slug
import datetime

class User:
    def __init__(self, username, email):
        self.username = username
        self.email = email
        self.created_at = datetime.datetime.now()
        self.posts = []
    
    def add_post(self, post):
        """Add a post to user's posts list"""
        self.posts.append(post)
        return post
    
    def get_posts(self):
        """Get all posts by this user"""
        return self.posts

class Post:
    def __init__(self, user, title, content):
        self.user = user
        self.title = title
        self.content = content
        self.slug = generate_slug(title)
        self.created_at = datetime.datetime.now()
        user.add_post(self)
    
    def update_content(self, new_content):
        """Update the post content"""
        self.content = new_content
        return self