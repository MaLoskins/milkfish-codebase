class Database:
    def __init__(self):
        self.connected = False
        self.data = {"users": [], "posts": []}
    
    def connect(self):
        """Connect to the database"""
        self.connected = True
        return self.connected
    
    def disconnect(self):
        """Disconnect from the database"""
        self.connected = False
        return not self.connected
    
    def save(self, obj):
        """Save an object to the database"""
        if not self.connected:
            raise ConnectionError("Database not connected")
            
        if hasattr(obj, 'username'):  # It's a User
            self.data["users"].append(obj)
        elif hasattr(obj, 'title'):  # It's a Post
            self.data["posts"].append(obj)
        
        return obj
    
    def find_user(self, username):
        """Find a user by username"""
        for user in self.data["users"]:
            if user.username == username:
                return user
        return None