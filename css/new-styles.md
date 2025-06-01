/* Global Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

:root {
    /* Core Colors */
    --dark-bg: #1a1a1a;
    --darker-bg: #121212;
    --card-bg: #242424;
    --text-color: #e0e0e0;
    --text-secondary: #b0b0b0;
    --magenta-primary: #ce3773;
    --magenta-secondary: #800335;
    --magenta-glow: rgba(232, 62, 140, 0.6);
    --border-color: #333;
    --highlight: #2d2d2d;
    
    /* Node Colors */
    --file-color: #3498db;
    --class-color: #e74c3c;
    --function-color: #2ecc71;
    --method-color: #9b59b6;
    --import-color: #f39c12;
    --module-color: #1abc9c;
    
    /* Shadows */
    --shadow-sm: 0 2px 10px rgba(0, 0, 0, 0.2);
    --shadow-md: 0 4px 15px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 6px 25px rgba(0, 0, 0, 0.4);
    --shadow-glow: 0 0 15px var(--magenta-glow);
    
    /* Transitions */
    --transition-fast: 0.2s ease;
    --transition-medium: 0.3s ease;
    --transition-slow: 0.5s ease;
    
    /* Border Radius */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-circle: 50%;
}

body {
    background-color: var(--dark-bg);
    color: var(--text-color);
    line-height: 1.6;
    overflow-x: hidden;
}

.container {
    display: flex;
    flex-wrap: wrap;
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
    gap: 20px;
}

h1, h2, h3 {
    margin-bottom: 15px;
    color: var(--text-color);
}

button {
    background-color: var(--magenta-primary);
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-medium);
    font-weight: 500;
    position: relative;
    overflow: hidden;
}

button::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(rgba(255, 255, 255, 0.1), transparent);
    opacity: 0;
    transition: opacity var(--transition-fast);
}

button:hover {
    background-color: var(--magenta-secondary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
}
