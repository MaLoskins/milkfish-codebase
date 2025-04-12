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
    let allFiles = [];
    let subdirectories = [];
    let selectedSubdirectories = [];
    const MAX_FILE_COUNT = 200;
    
    // Common directories to ignore
    const COMMON_IGNORE_DIRS = [
        '.venv', 'venv', 'env',
        'node_modules',
        '__pycache__',
        '.git', '.github',
        'build', 'dist',
        '.idea', '.vscode',
        'tests', 'test'
    ];
    
    // Initialize the graph visualizer
    graphVisualizer.initialize();
    
    // Handle directory selection
    directoryInput.addEventListener('change', function(e) {
        // Store all files
        allFiles = Array.from(e.target.files);
        
        // Get Python files
        const pythonFiles = allFiles.filter(file => file.name.endsWith('.py'));
        
        if (pythonFiles.length === 0) {
            showNotification('No Python files found in the selected directory.', true);
            analyzeBtn.disabled = true;
            return;
        }
        
        // Extract subdirectories
        extractSubdirectories(allFiles);
        
        // If there are multiple subdirectories and more than MAX_FILE_COUNT files, show the subdirectory selection modal
        if (subdirectories.length > 1 && pythonFiles.length > MAX_FILE_COUNT) {
            showSubdirectoryModal();
        } else {
            // If few files or only one subdirectory, use all files
            selectedFiles = pythonFiles;
            updateFileList();
            analyzeBtn.disabled = false;
        }
    });
    
    /**
     * Extract subdirectories from files
     * @param {Array} files - Array of file objects
     */
    function extractSubdirectories(files) {
        subdirectories = [];
        const dirSet = new Set();
        
        files.forEach(file => {
            const path = file.webkitRelativePath || file.name;
            const pathParts = path.split('/');
            
            if (pathParts.length > 1) {
                // Get top-level directory
                dirSet.add(pathParts[0]);
            }
        });
        
        subdirectories = Array.from(dirSet).sort();
        selectedSubdirectories = [...subdirectories]; // Initially select all
    }
    
    /**
     * Show the subdirectory selection modal
     */
    function showSubdirectoryModal() {
        const modal = document.getElementById('subdirectory-modal');
        const subdirList = document.getElementById('subdirectory-list');
        const closeBtn = document.querySelector('.close-modal');
        const confirmBtn = document.getElementById('confirm-subdirectory-btn');
        const cancelBtn = document.getElementById('cancel-subdirectory-btn');
        const ignoreCommonBtn = document.getElementById('ignore-common-btn');
        
        // Clear previous list
        subdirList.innerHTML = '';
        
        // Add checkboxes for each subdirectory
        subdirectories.forEach(dir => {
            const item = document.createElement('div');
            item.className = 'checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `dir-${dir}`;
            checkbox.value = dir;
            checkbox.checked = selectedSubdirectories.includes(dir);
            
            const label = document.createElement('label');
            label.htmlFor = `dir-${dir}`;
            label.textContent = dir;
            
            // Count Python files in this directory
            const fileCount = countPythonFilesInDir(dir);
            const countSpan = document.createElement('span');
            countSpan.className = 'file-count';
            countSpan.textContent = `(${fileCount} Python files)`;
            label.appendChild(document.createTextNode(' '));
            label.appendChild(countSpan);
            
            item.appendChild(checkbox);
            item.appendChild(label);
            subdirList.appendChild(item);
            
            // Add change event to update file count
            checkbox.addEventListener('change', updateSelectedFileCount);
        });
        
        // Show the modal
        modal.style.display = 'block';
        
        // Update initial file count
        updateSelectedFileCount();
        
        // Close modal when clicking the X
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
        
        // Handle ignore common directories button
        ignoreCommonBtn.onclick = function() {
            ignoreCommonDirectories();
            updateSelectedFileCount();
        };
        
        // Handle confirm button
        confirmBtn.onclick = function() {
            const selectedDirs = [];
            const checkboxes = subdirList.querySelectorAll('input[type="checkbox"]');
            
            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    selectedDirs.push(checkbox.value);
                }
            });
            
            // Update selected subdirectories
            selectedSubdirectories = selectedDirs;
            
            // Filter files based on selected subdirectories
            filterFilesBySubdirectories();
            
            // Check if file count is within limit
            const errorMsg = document.querySelector('.error-message') || document.createElement('div');
            errorMsg.className = 'error-message';
            
            if (selectedFiles.length > MAX_FILE_COUNT) {
                errorMsg.textContent = `Too many files selected (${selectedFiles.length}). Please select fewer subdirectories to stay under the limit of ${MAX_FILE_COUNT} files.`;
                errorMsg.style.display = 'block';
                
                if (!document.querySelector('.error-message')) {
                    const modalBody = document.querySelector('.modal-body');
                    modalBody.insertBefore(errorMsg, modalBody.firstChild);
                }
                
                return; // Don't close modal
            } else if (selectedFiles.length === 0) {
                errorMsg.textContent = 'No Python files selected. Please select at least one subdirectory containing Python files.';
                errorMsg.style.display = 'block';
                
                if (!document.querySelector('.error-message')) {
                    const modalBody = document.querySelector('.modal-body');
                    modalBody.insertBefore(errorMsg, modalBody.firstChild);
                }
                
                return; // Don't close modal
            } else {
                // Hide error if it exists
                errorMsg.style.display = 'none';
            }
            
            // Close modal
            modal.style.display = 'none';
            
            // Update file list and enable analyze button
            updateFileList();
            analyzeBtn.disabled = false;
        };
        
        // Handle cancel button
        cancelBtn.onclick = function() {
            // Reset directory input
            directoryInput.value = '';
            selectedFiles = [];
            allFiles = [];
            subdirectories = [];
            selectedSubdirectories = [];
            
            // Close modal
            modal.style.display = 'none';
            
            // Update file list and disable analyze button
            updateFileList();
            analyzeBtn.disabled = true;
        };
    }
    
    /**
     * Count Python files in a specific directory
     * @param {string} dir - Directory name
     * @returns {number} - Number of Python files
     */
    function countPythonFilesInDir(dir) {
        return allFiles.filter(file => {
            const path = file.webkitRelativePath || file.name;
            return path.startsWith(dir + '/') && path.endsWith('.py');
        }).length;
    }
    
    /**
     * Update the selected file count in the modal
     */
    function updateSelectedFileCount() {
        const selectedDirs = [];
        const checkboxes = document.querySelectorAll('#subdirectory-list input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedDirs.push(checkbox.value);
            }
        });
        
        // Count Python files in selected directories
        const count = allFiles.filter(file => {
            const path = file.webkitRelativePath || file.name;
            const pathParts = path.split('/');
            
            return path.endsWith('.py') &&
                   pathParts.length > 1 &&
                   selectedDirs.includes(pathParts[0]);
        }).length;
        
        // Update count display
        document.getElementById('selected-file-count').textContent = count;
        
        // Update button state based on count
        const confirmBtn = document.getElementById('confirm-subdirectory-btn');
        confirmBtn.disabled = count === 0 || count > MAX_FILE_COUNT;
        
        // Show warning if too many files
        const errorMsg = document.querySelector('.error-message') || document.createElement('div');
        errorMsg.className = 'error-message';
        
        if (count > MAX_FILE_COUNT) {
            errorMsg.textContent = `Too many files selected (${count}). Please select fewer subdirectories to stay under the limit of ${MAX_FILE_COUNT} files.`;
            errorMsg.style.display = 'block';
            
            if (!document.querySelector('.error-message')) {
                const modalBody = document.querySelector('.modal-body');
                modalBody.insertBefore(errorMsg, modalBody.firstChild);
            }
        } else {
            errorMsg.style.display = 'none';
        }
    }
    
    /**
     * Ignore common directories that are typically not relevant for code analysis
     */
    function ignoreCommonDirectories() {
        const checkboxes = document.querySelectorAll('#subdirectory-list input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            if (COMMON_IGNORE_DIRS.some(ignoreDir =>
                checkbox.value.toLowerCase().includes(ignoreDir.toLowerCase()))) {
                checkbox.checked = false;
            }
        });
    }
    
    /**
     * Filter files based on selected subdirectories
     */
    function filterFilesBySubdirectories() {
        selectedFiles = allFiles.filter(file => {
            const path = file.webkitRelativePath || file.name;
            const pathParts = path.split('/');
            
            return path.endsWith('.py') &&
                   pathParts.length > 1 &&
                   selectedSubdirectories.includes(pathParts[0]);
        });
    }
    
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