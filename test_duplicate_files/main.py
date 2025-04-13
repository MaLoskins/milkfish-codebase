# Import from both app1 and app2
from app1 import User
from app2 import Product

# Import from both utils files
from utils import subdirectory_utility_function
from utils import root_utility_function

def main():
    # Create a user from app1
    user = User("john_doe", "john@example.com")
    print(user)
    
    # Create a product from app2
    product = Product("Laptop", 999.99)
    print(product)
    
    # Use utility functions
    print(root_utility_function())
    print(subdirectory_utility_function())

if __name__ == "__main__":
    main()