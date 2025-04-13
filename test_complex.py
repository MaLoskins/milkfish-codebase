import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Union, Any

# Decorator example
def log_execution(func):
    def wrapper(*args, **kwargs):
        print(f"Executing {func.__name__}")
        result = func(*args, **kwargs)
        print(f"Finished {func.__name__}")
        return result
    return wrapper

# Class with inheritance and nested methods
class BaseModel:
    """Base model class with common functionality"""
    
    def __init__(self, id: int = None):
        self.id = id or 0
        self.created_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BaseModel':
        """Create model from dictionary"""
        instance = cls(id=data.get("id"))
        if "created_at" in data:
            instance.created_at = datetime.fromisoformat(data["created_at"])
        return instance

# Multiple inheritance
class Loggable:
    def log(self, message: str) -> None:
        print(f"[{datetime.now()}] {message}")

# Class with decorators, multiline methods, and complex inheritance
class User(BaseModel, Loggable):
    """User model with extended functionality"""
    
    def __init__(self, username: str, email: str, id: int = None):
        super().__init__(id)
        self.username = username
        self.email = email
        self.posts = []
        self.log(f"Created user {username}")
    
    @log_execution
    def add_post(self, post: 'Post') -> 'Post':
        """
        Add a post to user's posts list
        This is a multiline docstring
        that spans several lines
        """
        self.posts.append(post)
        self.log(f"Added post {post.title} to user {self.username}")
        return post
    
    def get_posts(self) -> List['Post']:
        """Get all posts by this user"""
        return self.posts
    
    def to_dict(self) -> Dict[str, Any]:
        """Override to_dict to include user-specific fields"""
        data = super().to_dict()
        data.update({
            "username": self.username,
            "email": self.email,
            "posts": [post.id for post in self.posts]
        })
        return data
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        return "@" in email and "." in email.split("@")[1]

# Class with complex relationships
class Post(BaseModel):
    def __init__(self, user: User, title: str, content: str, id: int = None):
        super().__init__(id)
        self.user = user
        self.title = title
        self.content = content
        self.comments = []
        user.add_post(self)  # This creates a circular reference
    
    def add_comment(self, text: str, author: User) -> 'Comment':
        """Add a comment to this post"""
        comment = Comment(post=self, author=author, text=text)
        self.comments.append(comment)
        return comment
    
    def to_dict(self) -> Dict[str, Any]:
        data = super().to_dict()
        data.update({
            "user_id": self.user.id,
            "title": self.title,
            "content": self.content,
            "comments": [comment.id for comment in self.comments]
        })
        return data

# Another class with complex relationships
class Comment(BaseModel):
    def __init__(self, post: Post, author: User, text: str, id: int = None):
        super().__init__(id)
        self.post = post
        self.author = author
        self.text = text
    
    def to_dict(self) -> Dict[str, Any]:
        data = super().to_dict()
        data.update({
            "post_id": self.post.id,
            "author_id": self.author.id,
            "text": self.text
        })
        return data

# Complex function with nested function definitions and lambda expressions
def process_data(data: List[Dict[str, Any]], filter_func=None) -> Dict[str, Any]:
    """
    Process a list of data dictionaries
    
    Args:
        data: List of dictionaries to process
        filter_func: Optional function to filter data
        
    Returns:
        Processed data as a dictionary
    """
    result = {"processed": [], "stats": {}}
    
    # Nested function definition
    def transform_item(item: Dict[str, Any]) -> Dict[str, Any]:
        transformed = item.copy()
        transformed["processed_at"] = datetime.now().isoformat()
        return transformed
    
    # Lambda usage
    sorter = lambda x: x.get("id", 0)
    
    # List comprehension with conditional
    filtered_data = [item for item in data if filter_func(item)] if filter_func else data
    
    # Sorting with key function
    sorted_data = sorted(filtered_data, key=sorter)
    
    # Map with nested function
    result["processed"] = list(map(transform_item, sorted_data))
    
    # Dictionary comprehension
    result["stats"] = {
        "count": len(result["processed"]),
        "ids": [item.get("id") for item in result["processed"] if "id" in item]
    }
    
    return result

# Main execution block with conditional
if __name__ == "__main__":
    # Create some test data
    user1 = User("john_doe", "john@example.com")
    user2 = User("jane_smith", "jane@example.com")
    
    post1 = Post(user1, "Hello World", "This is my first post")
    post2 = Post(user1, "Python Tips", "Here are some Python tips")
    post3 = Post(user2, "My Journey", "My journey with programming")
    
    post1.add_comment("Great post!", user2)
    post2.add_comment("Thanks for sharing", user2)
    post3.add_comment("Inspiring", user1)
    
    # Process some data
    test_data = [
        {"id": 1, "name": "Item 1"},
        {"id": 2, "name": "Item 2"},
        {"id": 3, "name": "Item 3"}
    ]
    
    result = process_data(test_data, filter_func=lambda x: x["id"] > 1)
    print(result)