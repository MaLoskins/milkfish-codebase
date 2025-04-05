/**
 * Main Application Script
 * Handles user interactions and coordinates between components
 */
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const directoryInput = document.getElementById('directory-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    const fileList = document.getElementById('file-list');
    
    // Files storage
    let selectedFiles = [];
    
    // Initialize the graph visualizer
    graphVisualizer.initialize();
    
    // Handle directory selection
    directoryInput.addEventListener('change', function(e) {
        selectedFiles = Array.from(e.target.files).filter(file => file.name.endsWith('.py'));
        
        // Update the file list display
        updateFileList();
        
        // Enable/disable analyze button based on file selection
        analyzeBtn.disabled = selectedFiles.length === 0;
    });
    
    // Handle analyze button click
    analyzeBtn.addEventListener('click', async function() {
        if (selectedFiles.length > 0) {
            // Parse files and generate graph
            const graphData = await pythonParser.parseFiles(selectedFiles);
            graphVisualizer.update(graphData);
        }
    });
    
    /**
     * Update the file list display
     */
    function updateFileList() {
        fileList.innerHTML = '';
        
        if (selectedFiles.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No Python files selected';
            fileList.appendChild(li);
            return;
        }
        
        // Group files by directory for better organization
        const filesByDir = {};
        
        selectedFiles.forEach(file => {
            const path = file.webkitRelativePath || file.name;
            const pathParts = path.split('/');
            const dirPath = pathParts.slice(0, -1).join('/') || '.';
            
            if (!filesByDir[dirPath]) {
                filesByDir[dirPath] = [];
            }
            
            filesByDir[dirPath].push({
                name: pathParts[pathParts.length - 1],
                path: path
            });
        });
        
        // Create directory groups
        Object.keys(filesByDir).sort().forEach(dir => {
            const dirLi = document.createElement('li');
            dirLi.className = 'directory';
            
            // Format the directory name
            const dirName = dir === '.' ? 'Root' : dir;
            dirLi.innerHTML = `<strong>${dirName}</strong> (${filesByDir[dir].length} files)`;
            fileList.appendChild(dirLi);
            
            // Create a nested list for files
            const fileUl = document.createElement('ul');
            fileUl.className = 'file-sublist';
            
            // Add each file
            filesByDir[dir].sort((a, b) => a.name.localeCompare(b.name)).forEach(file => {
                const fileLi = document.createElement('li');
                fileLi.textContent = file.name;
                fileLi.className = 'file-item';
                fileUl.appendChild(fileLi);
            });
            
            fileList.appendChild(fileUl);
        });
    }
    
    // Add demo functionality
    setupDemoButton();
});

/**
 * Set up demo button to load sample Python code
 */
function setupDemoButton() {
    // Create a demo button
    const controlsDiv = document.querySelector('.controls');
    const demoBtn = document.createElement('button');
    demoBtn.id = 'demo-btn';
    demoBtn.textContent = 'Load Sample Code';
    controlsDiv.appendChild(demoBtn);
    
    // Handle demo button click
    demoBtn.addEventListener('click', function() {
        loadSampleCode();
    });
}

/**
 * Load sample Python code from the sample_python_code directory
 */
async function loadSampleCode() {
    try {
        // Sample code files to fetch
        const sampleFiles = [
            'main.py',
            'utils.py',
            'models.py',
            'database.py'
        ];
        
        // Fetch and load the files
        const loadedFiles = [];
        
        for (const filename of sampleFiles) {
            const response = await fetch(`sample_python_code/${filename}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${filename}`);
            }
            
            const content = await response.text();
            
            // Create a File object
            const file = new File([content], filename, { type: 'text/x-python' });
            loadedFiles.push(file);
        }
        
        // Display files in the list
        const fileList = document.getElementById('file-list');
        fileList.innerHTML = '';
        
        const header = document.createElement('li');
        header.innerHTML = '<strong>Sample Python Code</strong>';
        fileList.appendChild(header);
        
        loadedFiles.forEach(file => {
            const li = document.createElement('li');
            li.className = 'file-item';
            li.textContent = file.name;
            fileList.appendChild(li);
        });
        
        // Enable the analyze button
        document.getElementById('analyze-btn').disabled = false;
        
        // Parse and visualize the sample code
        const graphData = await pythonParser.parseFiles(loadedFiles);
        graphVisualizer.update(graphData);
        
        // Show success message
        showNotification('Sample code loaded and analyzed!');
        
    } catch (error) {
        console.error('Error loading sample code:', error);
        showNotification('Error loading sample code. See console for details.', true);
    }
}

/**
 * Display a notification message
 * @param {string} message - Message to display
 * @param {boolean} isError - Whether this is an error message
 */
function showNotification(message, isError = false) {
    // Check if a notification already exists
    let notification = document.querySelector('.notification');
    
    if (!notification) {
        // Create notification element
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set notification content and style
    notification.textContent = message;
    notification.className = isError ? 'notification error' : 'notification';
    
    // Show the notification
    notification.style.display = 'block';
    
    // Hide after a delay
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
            notification.style.opacity = '1';
        }, 500);
    }, 3000);
}

// Add notification styles
addNotificationStyles();

/**
 * Add CSS styles for notifications
 */
function addNotificationStyles() {
    // Use CSS variables from our main stylesheet
    const magentaPrimary = getComputedStyle(document.documentElement).getPropertyValue('--magenta-primary').trim();
    
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background-color: ${magentaPrimary};
            color: white;
            border-radius: 6px;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4), 0 0 20px rgba(232, 62, 140, 0.3);
            transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            font-weight: 500;
            transform: translateY(-10px);
            opacity: 0;
            animation: notificationEnter 0.5s forwards;
        }
        
        @keyframes notificationEnter {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .notification.error {
            background-color: #e74c3c;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4), 0 0 20px rgba(231, 76, 60, 0.3);
        }
    `;
    document.head.appendChild(style);
}