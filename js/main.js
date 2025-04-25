/**
 * Main Application Script
 * Handles user interactions and coordinates between components
 */

// Play fish sound and show loading screen immediately
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded - initializing loading screen");
    
    // Get elements
    const loadingScreen = document.getElementById('loading-screen');
    const fishSound = document.getElementById('fish-sound');
    
    // Play fish sound immediately
    if (fishSound) {
        console.log("Attempting to play fish sound");
        
        // Force sound to be unmuted and at full volume
        fishSound.muted = false;
        fishSound.volume = 1.0;
        
        // Play the sound directly
        fishSound.play()
            .then(() => console.log("Fish sound playing successfully"))
            .catch(error => {
                console.error("Could not autoplay fish sound:", error);
                
                // Add a click handler to play sound on first user interaction
                document.body.addEventListener('click', function playOnClick() {
                    fishSound.play();
                    document.body.removeEventListener('click', playOnClick);
                }, { once: true });
            });
    } else {
        console.error("Fish sound element not found");
    }
    
    // Fallback: Hide loading screen after a maximum timeout (10 seconds)
    if (loadingScreen) {
        setTimeout(() => {
            console.log("Hiding loading screen after timeout");
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 1500);
        }, 10000);
    }
});

// Also try playing on window load
window.addEventListener('load', function() {
    console.log("Window loaded - trying to play sound again");
    const fishSound = document.getElementById('fish-sound');
    if (fishSound) {
        fishSound.currentTime = 0;
        fishSound.play()
            .then(() => console.log("Fish sound playing on window load"))
            .catch(e => console.warn("Could not play fish sound on window load:", e));
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const fileInput = document.getElementById('file-input');
    const directoryInput = document.getElementById('directory-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    const fileList = document.getElementById('file-list');
    const pythonFileCount = document.getElementById('python-file-count');
    
    // Files storage
    let selectedFiles = [];
    let allFiles = new Map(); // Map to store files with their paths as keys
    let subdirectories = [];
    let selectedSubdirectories = [];
    const MAX_FILE_COUNT = 300;
    const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 15MB in bytes
    let totalFileSize = 0; // Track total size of selected files
    
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
    
    // Handle individual file selection
    fileInput.addEventListener('change', function(e) {
        const newFiles = Array.from(e.target.files);
        
        // Filter for Python files
        const pythonFiles = newFiles.filter(file => file.name.endsWith('.py'));
        
        if (pythonFiles.length === 0) {
            showNotification('No Python files selected. Please select .py files.', true);
            return;
        }
        
        // Add files to the collection
        addFilesToCollection(pythonFiles);
        
        // Reset the file input
        fileInput.value = '';
    });
    
    // Handle directory selection
    directoryInput.addEventListener('change', function(e) {
        const newFiles = Array.from(e.target.files);
        
        // Get Python files
        const pythonFiles = newFiles.filter(file => file.name.endsWith('.py'));
        
        if (pythonFiles.length === 0) {
            showNotification('No Python files found in the selected directory.', true);
            return;
        }
        
        // Extract subdirectories from this selection
        const dirFiles = [...newFiles]; // Create a copy for subdirectory extraction
        extractSubdirectories(dirFiles);
        
        // If there are multiple subdirectories and more than MAX_FILE_COUNT files, show the subdirectory selection modal
        if (subdirectories.length > 1 && pythonFiles.length > MAX_FILE_COUNT) {
            // Store the current files temporarily for the modal
            const tempFiles = [...newFiles];
            
            // Show subdirectory selection modal with these files
            showSubdirectoryModal(tempFiles);
        } else {
            // If few files or only one subdirectory, add all Python files
            addFilesToCollection(pythonFiles);
        }
        
        // Reset the directory input
        directoryInput.value = '';
    });
    
    // Handle clear selection button
    clearSelectionBtn.addEventListener('click', function() {
        clearFileSelection();
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
     * @param {Array} tempFiles - Temporary array of files from the current directory selection
     */
    function showSubdirectoryModal(tempFiles) {
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
            const fileCount = countPythonFilesInDir(dir, tempFiles);
            const countSpan = document.createElement('span');
            countSpan.className = 'file-count';
            countSpan.textContent = `(${fileCount} Python files)`;
            label.appendChild(document.createTextNode(' '));
            label.appendChild(countSpan);
            
            item.appendChild(checkbox);
            item.appendChild(label);
            subdirList.appendChild(item);
            
            // Add change event to update file count
            checkbox.addEventListener('change', function() {
                updateSelectedFileCount(tempFiles);
            });
        });
        
        // Show the modal
        modal.style.display = 'block';
        
        // Update initial file count
        updateSelectedFileCount(tempFiles);
        
        // Close modal when clicking the X
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
        
        // Handle ignore common directories button
        ignoreCommonBtn.onclick = function() {
            ignoreCommonDirectories();
            updateSelectedFileCount(tempFiles);
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
            const filteredFiles = filterFilesBySubdirectories(tempFiles);
            
            // Check if file count is within limit
            const errorMsg = document.querySelector('.error-message') || document.createElement('div');
            errorMsg.className = 'error-message';
            
            if (filteredFiles.length > MAX_FILE_COUNT) {
                errorMsg.textContent = `Too many files selected (${filteredFiles.length}). Please select fewer subdirectories to stay under the limit of ${MAX_FILE_COUNT} files.`;
                errorMsg.style.display = 'block';
                
                if (!document.querySelector('.error-message')) {
                    const modalBody = document.querySelector('.modal-body');
                    modalBody.insertBefore(errorMsg, modalBody.firstChild);
                }
                
                return; // Don't close modal
            } else if (filteredFiles.length === 0) {
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
            
            // Add the filtered files to our collection
            addFilesToCollection(filteredFiles);
            
            // Close modal
            modal.style.display = 'none';
        };
        
        // Handle cancel button
        cancelBtn.onclick = function() {
            // Close modal without adding files
            modal.style.display = 'none';
        };
    }
    
    /**
     * Count Python files in a specific directory
     * @param {string} dir - Directory name
     * @param {Array} files - Array of files to count from
     * @returns {number} - Number of Python files
     */
    function countPythonFilesInDir(dir, files) {
        return files.filter(file => {
            const path = file.webkitRelativePath || file.name;
            return path.startsWith(dir + '/') && path.endsWith('.py');
        }).length;
    }
    
    /**
     * Update the selected file count in the modal
     * @param {Array} files - Array of files to count from
     */
    function updateSelectedFileCount(files) {
        const selectedDirs = [];
        const checkboxes = document.querySelectorAll('#subdirectory-list input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedDirs.push(checkbox.value);
            }
        });
        
        // Count Python files in selected directories
        const count = files.filter(file => {
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
     * @param {Array} files - Array of files to filter
     * @returns {Array} - Filtered files
     */
    function filterFilesBySubdirectories(files) {
        return files.filter(file => {
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
            // Strictly enforce the file count limit
            if (selectedFiles.length > MAX_FILE_COUNT) {
                showNotification(`Error: Cannot analyze. The number of files (${selectedFiles.length}) exceeds the maximum limit of ${MAX_FILE_COUNT} files.`, true);
                return;
            }
            
            // Strictly enforce the file size limit
            if (totalFileSize > MAX_TOTAL_SIZE) {
                const totalSizeMB = (totalFileSize / (1024 * 1024)).toFixed(2);
                const maxSizeMB = (MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(0);
                showNotification(`Error: Cannot analyze. The total file size (${totalSizeMB}MB) exceeds the maximum limit of ${maxSizeMB}MB.`, true);
                return;
            }
            
            // Show loading notification
            showNotification('Analyzing codebase, please wait...');
            
            // Parse files and generate graph
            const graphData = await pythonParser.parseFiles(selectedFiles);
            graphVisualizer.update(graphData);
            
            // Show success notification
            showNotification('Codebase analysis complete!');
        }
    });
    
    /**
     * Update the file list display
     */
    /**
     * Calculate the total size of files
     * @param {Array} files - Array of file objects
     * @returns {number} - Total size in bytes
     */
    function calculateTotalSize(files) {
        return files.reduce((total, file) => total + file.size, 0);
    }
    
    /**
     * Normalize file paths to maintain hierarchical structure
     * @param {string} path - Original file path
     * @returns {Object} - Normalized path information
     */
    function normalizePath(path) {
        // Split the path into parts
        const parts = path.split('/');
        const fileName = parts[parts.length - 1];
        
        // Handle different path formats
        let dirPath = '';
        let displayPath = '';
        
        if (parts.length > 1) {
            // This is a path with directories
            dirPath = parts.slice(0, -1).join('/');
            
            // Create a display path that shows the hierarchical structure
            // For paths like "MILKFISH_VIBES/src/api_gateway/file.py"
            // We want to show the full path structure
            displayPath = dirPath;
        } else {
            // This is just a filename with no directory
            dirPath = '.';
            displayPath = 'Root';
        }
        
        return {
            originalPath: path,
            dirPath: dirPath,
            displayPath: displayPath,
            fileName: fileName
        };
    }
    
    /**
     * Find common path prefix among all files
     * @returns {string} - Common path prefix
     */
    function findCommonPathPrefix() {
        if (allFiles.size === 0) return '';
        
        // Get all paths
        const paths = Array.from(allFiles.keys());
        
        // Find the shortest path to avoid index out of bounds
        const shortestPath = paths.reduce((shortest, current) =>
            current.length < shortest.length ? current : shortest, paths[0]);
        
        // Split paths into parts
        const pathParts = paths.map(path => path.split('/'));
        const shortestParts = shortestPath.split('/');
        
        // Find common prefix
        let commonPrefix = [];
        for (let i = 0; i < shortestParts.length - 1; i++) { // -1 to exclude filename
            const part = shortestParts[i];
            if (pathParts.every(parts => parts[i] === part)) {
                commonPrefix.push(part);
            } else {
                break;
            }
        }
        
        return commonPrefix.join('/');
    }
    
    /**
     * Check if a file is a duplicate of an existing file
     * @param {File} newFile - The new file to check
     * @returns {string|null} - The path of the duplicate file if found, null otherwise
     */
    function findDuplicateFile(newFile) {
        const newFileName = newFile.name;
        const newFileSize = newFile.size;
        
        // First quick check: if there's no file with the same name and size, it's not a duplicate
        let potentialDuplicate = null;
        
        for (const [path, existingFile] of allFiles.entries()) {
            // Check if the file name matches
            if (existingFile.name === newFileName && existingFile.size === newFileSize) {
                potentialDuplicate = path;
                break;
            }
        }
        
        return potentialDuplicate;
    }
    
    /**
     * Add files to the collection and update UI
     * @param {Array} files - Array of file objects to add
     */
    function addFilesToCollection(files) {
        // Check if adding these files would exceed the file count limit
        const currentCount = selectedFiles.length;
        
        // Count unique files (excluding duplicates)
        let uniqueFiles = 0;
        let duplicateFiles = 0;
        
        // Pre-process files to identify duplicates
        const filesToAdd = [];
        const duplicatePaths = new Map();
        
        files.forEach(file => {
            const duplicatePath = findDuplicateFile(file);
            
            if (duplicatePath) {
                // This is a duplicate file
                duplicateFiles++;
                duplicatePaths.set(file, duplicatePath);
            } else {
                // This is a unique file
                uniqueFiles++;
                filesToAdd.push(file);
            }
        });
        
        const newCount = currentCount + uniqueFiles;
        
        if (newCount > MAX_FILE_COUNT) {
            showNotification(`Error: Cannot add files. The total number of files (${newCount}) would exceed the limit of ${MAX_FILE_COUNT} files.`, true);
            return;
        }
        
        // Check if adding these files would exceed the size limit
        const newFilesSize = calculateTotalSize(filesToAdd);
        const newTotalSize = totalFileSize + newFilesSize;
        
        if (newTotalSize > MAX_TOTAL_SIZE) {
            const currentSizeMB = (totalFileSize / (1024 * 1024)).toFixed(2);
            const newSizeMB = (newFilesSize / (1024 * 1024)).toFixed(2);
            const maxSizeMB = (MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(0);
            
            showNotification(`Error: Cannot add files. Current size: ${currentSizeMB}MB + New files: ${newSizeMB}MB would exceed the limit of ${maxSizeMB}MB.`, true);
            return;
        }
        
        // Add unique files to the collection with normalized paths
        filesToAdd.forEach(file => {
            const originalPath = file.webkitRelativePath || file.name;
            
            // Store the file with its original path
            allFiles.set(originalPath, file);
            
            // Store normalized path information in the file object for later use
            file.normalizedPath = normalizePath(originalPath);
            
            // Store the full path for duplicate detection
            file.fullPath = originalPath;
        });
        
        // Update total file size
        totalFileSize = newTotalSize;
        
        // Update selected files array
        selectedFiles = Array.from(allFiles.values()).filter(file => file.name.endsWith('.py'));
        
        // Update UI
        updateFileList();
        updateFileCount();
        
        // Enable/disable buttons based on selection
        analyzeBtn.disabled = selectedFiles.length === 0;
        clearSelectionBtn.disabled = selectedFiles.length === 0;
        
        // Show notification with duplicate information
        if (duplicateFiles > 0) {
            showNotification(`Added ${uniqueFiles} file(s) to selection. Skipped ${duplicateFiles} duplicate file(s).`);
        } else {
            showNotification(`Added ${uniqueFiles} file(s) to selection.`);
        }
    }
    
    /**
     * Clear all selected files
     */
    function clearFileSelection() {
        allFiles.clear();
        selectedFiles = [];
        totalFileSize = 0; // Reset total file size
        updateFileList();
        updateFileCount();
        
        // Disable buttons
        analyzeBtn.disabled = true;
        clearSelectionBtn.disabled = true;
        
        showNotification('File selection cleared.');
    }
    
    /**
     * Update the file count display
     */
    function updateFileCount() {
        // Update file count display
        pythonFileCount.textContent = selectedFiles.length;
        
        // Add file size information
        const totalSizeMB = (totalFileSize / (1024 * 1024)).toFixed(2);
        const maxSizeMB = (MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(0);
        
        // Update the file count element to include size information
        const fileCountElement = document.querySelector('.file-count');
        if (fileCountElement) {
            fileCountElement.innerHTML = `<span>${selectedFiles.length}</span> Python files selected (<span>${totalSizeMB}</span>MB of ${maxSizeMB}MB)`;
        }
        
        // Show warning if approaching limits
        if (selectedFiles.length > MAX_FILE_COUNT * 0.8 || totalFileSize > MAX_TOTAL_SIZE * 0.8) {
            let warningMessage = '';
            
            if (selectedFiles.length > MAX_FILE_COUNT * 0.8) {
                warningMessage += `File count (${selectedFiles.length}) is approaching the limit of ${MAX_FILE_COUNT}. `;
            }
            
            if (totalFileSize > MAX_TOTAL_SIZE * 0.8) {
                warningMessage += `Total size (${totalSizeMB}MB) is approaching the limit of ${maxSizeMB}MB.`;
            }
            
            showNotification(`Warning: ${warningMessage}`, true);
        }
    }
    
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
        
        // Find common path prefix to improve directory structure display
        const commonPrefix = findCommonPathPrefix();
        
        // Group files by directory for better organization
        const filesByDir = {};
        const directoryTree = {};
        
        selectedFiles.forEach(file => {
            // Get the normalized path information
            const pathInfo = file.normalizedPath || normalizePath(file.webkitRelativePath || file.name);
            
            // Determine the display path, removing common prefix if it exists
            let displayPath = pathInfo.dirPath;
            if (commonPrefix && displayPath.startsWith(commonPrefix) && displayPath !== commonPrefix) {
                // Remove common prefix and ensure it starts with the top-level directory
                const topDir = commonPrefix.split('/')[0];
                displayPath = topDir + displayPath.substring(commonPrefix.length);
            }
            
            // Use the display path as the key for grouping
            const dirKey = displayPath || '.';
            
            if (!filesByDir[dirKey]) {
                filesByDir[dirKey] = [];
                
                // Build directory tree structure
                if (dirKey !== '.' && dirKey.includes('/')) {
                    const parts = dirKey.split('/');
                    let currentLevel = directoryTree;
                    
                    parts.forEach(part => {
                        if (!currentLevel[part]) {
                            currentLevel[part] = {};
                        }
                        currentLevel = currentLevel[part];
                    });
                }
            }
            
            filesByDir[dirKey].push({
                name: pathInfo.fileName,
                path: pathInfo.originalPath,
                file: file,
                displayPath: displayPath
            });
        });
        
        // Create directory groups
        Object.keys(filesByDir).sort().forEach(dir => {
            const dirLi = document.createElement('li');
            dirLi.className = 'directory';
            
            // Format the directory name
            let dirName = dir === '.' ? 'Root' : dir;
            
            // Create directory header with remove button
            const dirHeader = document.createElement('div');
            dirHeader.className = 'directory-header';
            
            const dirTitle = document.createElement('span');
            dirTitle.innerHTML = `<strong>${dirName}</strong> (${filesByDir[dir].length} files)`;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '×';
            removeBtn.title = 'Remove all files in this directory';
            removeBtn.addEventListener('click', function() {
                removeDirectory(dir);
            });
            
            dirHeader.appendChild(dirTitle);
            dirHeader.appendChild(removeBtn);
            dirLi.appendChild(dirHeader);
            
            fileList.appendChild(dirLi);
            
            // Create a nested list for files
            const fileUl = document.createElement('ul');
            fileUl.className = 'file-sublist';
            
            // Add each file
            filesByDir[dir].sort((a, b) => a.name.localeCompare(b.name)).forEach(file => {
                const fileLi = document.createElement('li');
                fileLi.className = 'file-item';
                
                // Create file item with remove button
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item-content';
                
                const fileName = document.createElement('span');
                fileName.textContent = file.name;
                
                const removeFileBtn = document.createElement('button');
                removeFileBtn.className = 'remove-btn small';
                removeFileBtn.textContent = '×';
                removeFileBtn.title = 'Remove this file';
                removeFileBtn.addEventListener('click', function() {
                    removeFile(file.path);
                });
                
                fileItem.appendChild(fileName);
                fileItem.appendChild(removeFileBtn);
                fileLi.appendChild(fileItem);
                
                fileUl.appendChild(fileLi);
            });
            
            fileList.appendChild(fileUl);
        });
    }
    
    /**
     * Remove a file from the collection
     * @param {string} path - Path of the file to remove
     */
    function removeFile(path) {
        if (allFiles.has(path)) {
            // Get the file size before removing
            const file = allFiles.get(path);
            const fileSize = file.size;
            
            // Remove the file
            allFiles.delete(path);
            
            // Update total file size
            totalFileSize -= fileSize;
            
            // Update selected files
            selectedFiles = Array.from(allFiles.values()).filter(file => file.name.endsWith('.py'));
            
            // Update UI
            updateFileList();
            updateFileCount();
            
            // Enable/disable buttons
            analyzeBtn.disabled = selectedFiles.length === 0;
            clearSelectionBtn.disabled = selectedFiles.length === 0;
            
            showNotification('File removed from selection.');
        }
    }
    
    /**
     * Remove all files in a directory
     * @param {string} dirPath - Directory path
     */
    function removeDirectory(dirPath) {
        // Get all files in this directory
        const filesToRemove = [];
        let sizeToRemove = 0;
        
        // Handle both normalized paths and original paths
        allFiles.forEach((file, path) => {
            // Check if the file has a normalized path
            if (file.normalizedPath) {
                // Use the normalized display path for comparison
                const normalizedDirPath = file.normalizedPath.displayPath;
                
                // Check if this file belongs to the directory we're removing
                if ((dirPath === '.' && normalizedDirPath === 'Root') ||
                    (dirPath !== '.' && normalizedDirPath === dirPath)) {
                    filesToRemove.push(path);
                    sizeToRemove += file.size;
                }
            } else {
                // Fall back to the original path splitting method
                const pathParts = path.split('/');
                const fileDirPath = pathParts.slice(0, -1).join('/') || '.';
                
                if (fileDirPath === dirPath) {
                    filesToRemove.push(path);
                    sizeToRemove += file.size;
                }
            }
        });
        
        // Remove all files
        filesToRemove.forEach(path => {
            allFiles.delete(path);
        });
        
        // Update total file size
        totalFileSize -= sizeToRemove;
        
        // Update selected files
        selectedFiles = Array.from(allFiles.values()).filter(file => file.name.endsWith('.py'));
        
        // Update UI
        updateFileList();
        updateFileCount();
        
        // Enable/disable buttons
        analyzeBtn.disabled = selectedFiles.length === 0;
        clearSelectionBtn.disabled = selectedFiles.length === 0;
        
        showNotification(`Removed ${filesToRemove.length} files (${(sizeToRemove / (1024 * 1024)).toFixed(2)}MB) from selection.`);
    }
    
    // Add demo functionality
    setupDemoButton();
    
    // Set up GitHub repository integration
    setupGitHubIntegration();
});

/**
 * Set up GitHub repository integration
 */
function setupGitHubIntegration() {
    // Get GitHub elements
    const githubRepoUrl = document.getElementById('github-repo-url');
    const githubFetchBtn = document.getElementById('github-fetch-btn');
    const repoInfo = document.getElementById('repo-info');
    const repoName = document.getElementById('repo-name');
    const repoStars = document.getElementById('repo-stars');
    const repoForks = document.getElementById('repo-forks');
    const repoDescription = document.getElementById('repo-description');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Check if elements exist
    if (!githubFetchBtn || !githubRepoUrl) {
        console.error('GitHub elements not found in the DOM');
        return;
    }
    
    // Check if GitHub integration script is loaded
    if (typeof githubIntegration === 'undefined') {
        console.error('GitHub integration script not loaded');
        return;
    }
    
    // Handle GitHub fetch button click
    githubFetchBtn.addEventListener('click', async function() {
        const url = githubRepoUrl.value.trim();
        
        if (!url) {
            showNotification('Please enter a GitHub repository URL', true);
            return;
        }
        
        try {
            // Show loading indicator
            loadingIndicator.style.display = 'flex';
            githubFetchBtn.disabled = true;
            // Clear any previous selection
            // We can't directly call the clearFileSelection function as it's in a different scope
            // So we'll simulate it by clearing the file list and disabling buttons
            const fileListElement = document.getElementById('file-list');
            const pythonFileCountElement = document.getElementById('python-file-count');
            const analyzeButton = document.getElementById('analyze-btn');
            
            if (fileListElement) {
                fileListElement.innerHTML = '<li>No Python files selected</li>';
            }
            
            if (pythonFileCountElement) {
                pythonFileCountElement.textContent = '0';
            }
            
            if (analyzeButton) {
                analyzeButton.disabled = true;
            }
            document.getElementById('clear-selection-btn').disabled = true;
            
            // Define constants for file limits (same as in the main scope)
            const MAX_FILE_COUNT = 300;
            const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB in bytes
            
            // Process the repository
            const result = await githubIntegration.processRepository(url, MAX_FILE_COUNT, MAX_TOTAL_SIZE);
            
            
            // Display repository information
            displayRepositoryInfo(result.metadata, repoName, repoStars, repoForks, repoDescription, repoInfo);
            
            // Check if repository exceeds limits
            if (result.exceedsFileCountLimit) {
                showNotification(`Repository has too many Python files (${result.fileCount}). Maximum allowed is ${MAX_FILE_COUNT}.`, true);
                loadingIndicator.style.display = 'none';
                githubFetchBtn.disabled = false;
                return;
            }
            
            if (result.exceedsLimit) {
                const totalSizeMB = (result.totalSize / (1024 * 1024)).toFixed(2);
                const maxSizeMB = (MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(0);
                showNotification(`Repository size (${totalSizeMB}MB) exceeds the maximum limit of ${maxSizeMB}MB.`, true);
                loadingIndicator.style.display = 'none';
                githubFetchBtn.disabled = false;
                return;
            }
            
            // Check if we need to show subdirectory selection
            if (result.subdirectories.length > 1 && result.fileCount > MAX_FILE_COUNT / 2) {
                // Show subdirectory selection modal
                showGitHubSubdirectoryModal(result.subdirectories, loadingIndicator);
            } else {
                // Process all files
                await processGitHubFiles(loadingIndicator);
            }
            
        } catch (error) {
            console.error('Error processing GitHub repository:', error);
            showNotification(`Error: ${error.message}`, true);
        } finally {
            // Hide loading indicator
            loadingIndicator.style.display = 'none';
            githubFetchBtn.disabled = false;
        }
    });
}

/**
 * Display repository information
 * @param {Object} metadata - Repository metadata from GitHub API
 * @param {HTMLElement} nameElement - Repository name element
 * @param {HTMLElement} starsElement - Stars count element
 * @param {HTMLElement} forksElement - Forks count element
 * @param {HTMLElement} descriptionElement - Description element
 * @param {HTMLElement} infoContainer - Repository info container
 */
function displayRepositoryInfo(metadata, nameElement, starsElement, forksElement, descriptionElement, infoContainer) {
    nameElement.textContent = metadata.name;
    starsElement.textContent = metadata.stargazers_count.toLocaleString();
    forksElement.textContent = metadata.forks_count.toLocaleString();
    descriptionElement.textContent = metadata.description || 'No description available';
    
    // Show repository info section
    infoContainer.style.display = 'block';
}

/**
 * Show subdirectory selection modal for GitHub repositories
 * @param {Array} subdirectories - Array of subdirectory names
 * @param {HTMLElement} loadingIndicator - Loading indicator element
 */
function showGitHubSubdirectoryModal(subdirectories, loadingIndicator) {
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
        checkbox.checked = true; // Initially select all
        
        const label = document.createElement('label');
        label.htmlFor = `dir-${dir}`;
        label.textContent = dir;
        
        item.appendChild(checkbox);
        item.appendChild(label);
        subdirList.appendChild(item);
    });
    
    // Show the modal
    modal.style.display = 'block';
    
    // Close modal when clicking the X
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    
    // Handle ignore common directories button
    ignoreCommonBtn.onclick = function() {
        // Define common directories to ignore (same as in the main scope)
        const COMMON_IGNORE_DIRS = [
            '.venv', 'venv', 'env',
            'node_modules',
            '__pycache__',
            '.git', '.github',
            'build', 'dist',
            '.idea', '.vscode',
            'tests', 'test'
        ];
        
        // Implement ignore common directories functionality
        const checkboxes = subdirList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (COMMON_IGNORE_DIRS.some(ignoreDir =>
                checkbox.value.toLowerCase().includes(ignoreDir.toLowerCase()))) {
                checkbox.checked = false;
            }
        });
    };
    
    // Handle confirm button
    confirmBtn.onclick = async function() {
        const selectedDirs = [];
        const checkboxes = subdirList.querySelectorAll('input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedDirs.push(checkbox.value);
            }
        });
        
        if (selectedDirs.length === 0) {
            showNotification('Please select at least one subdirectory', true);
            return;
        }
        
        // Show loading indicator
        loadingIndicator.style.display = 'flex';
        
        try {
            // Define constants for file limits (same as in the main scope)
            const MAX_FILE_COUNT = 300;
            const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB in bytes
            
            // Process selected directories
            await githubIntegration.processSelectedDirectories(selectedDirs, MAX_FILE_COUNT, MAX_TOTAL_SIZE);
            
            // Process files
            await processGitHubFiles(loadingIndicator);
            
            // Close modal
            modal.style.display = 'none';
        } catch (error) {
            console.error('Error processing selected directories:', error);
            showNotification(`Error: ${error.message}`, true);
        } finally {
            // Hide loading indicator
            loadingIndicator.style.display = 'none';
        }
    };
    
    // Handle cancel button
    cancelBtn.onclick = function() {
        // Close modal without processing
        modal.style.display = 'none';
    };
}

/**
 * Process GitHub files and update UI
 * @param {HTMLElement} loadingIndicator - Loading indicator element
 */
async function processGitHubFiles(loadingIndicator) {
    try {
        // Show loading notification
        showNotification('Preparing files for analysis...');
        
        // Convert GitHub files to File objects
        const fileObjects = await githubIntegration.prepareFilesForAnalysis();
        
        if (fileObjects.length === 0) {
            showNotification('No Python files found in the repository', true);
            return;
        }
        // We can't directly call addFilesToCollection as it's in a different scope
        // Instead, we'll display the files in the file list and enable the analyze button
        const fileList = document.getElementById('file-list');
        if (fileList) {
            fileList.innerHTML = '';
            
            // Display files in the list
            const header = document.createElement('li');
            header.innerHTML = '<strong>GitHub Repository Files</strong>';
            fileList.appendChild(header);
            
            fileObjects.forEach(file => {
                const li = document.createElement('li');
                li.className = 'file-item';
                li.textContent = file.webkitRelativePath || file.name;
                fileList.appendChild(li);
            });
        }
        // Update file count display
        const pythonFileCountElement = document.getElementById('python-file-count');
        if (pythonFileCountElement) {
            pythonFileCountElement.textContent = fileObjects.length;
        }
        
        
        // Enable the analyze button
        const analyzeButton = document.getElementById('analyze-btn');
        if (analyzeButton) {
            analyzeButton.disabled = false;
        }
        
        
        // Automatically trigger analysis
        const analyzeBtn = document.getElementById('analyze-btn');
        if (fileObjects.length > 0 && analyzeBtn && !analyzeBtn.disabled) {
            showNotification(`Analyzing ${fileObjects.length} Python files from GitHub repository...`);
            // Parse files and generate graph
            const graphData = await pythonParser.parseFiles(fileObjects);
            graphVisualizer.update(graphData);
            
            
            // Show success notification
            showNotification('GitHub repository analysis complete!');
        }
    } catch (error) {
        console.error('Error processing GitHub files:', error);
        showNotification(`Error: ${error.message}`, true);
    }
}

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
        console.log("Loading test duplicate files with hardcoded content...");
        
        // Create test files with hardcoded content
        const testFiles = [
            {
                name: 'main.py',
                webkitRelativePath: 'test_duplicate_files/main.py',
                content: `# Import from both app1 and app2
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
    main()`
            },
            {
                name: 'utils.py',
                webkitRelativePath: 'test_duplicate_files/utils.py',
                content: `def root_utility_function():
    """A utility function in the root directory"""
    return "This is a utility function from the root directory"`
            },
            {
                name: 'utils.py',
                webkitRelativePath: 'test_duplicate_files/utils/utils.py',
                content: `def subdirectory_utility_function():
    """A utility function in the utils subdirectory"""
    return "This is a utility function from the utils subdirectory"`
            },
            {
                name: 'models.py',
                webkitRelativePath: 'test_duplicate_files/app1/models.py',
                content: `class User:
    def __init__(self, username, email):
        self.username = username
        self.email = email
        
    def __str__(self):
        return f"App1 User: {self.username}"`
            },
            {
                name: 'models.py',
                webkitRelativePath: 'test_duplicate_files/app2/models.py',
                content: `class Product:
    def __init__(self, name, price):
        self.name = name
        self.price = price
        
    def __str__(self):
        return f"App2 Product: {self.name}"`
            },
            {
                name: '__init__.py',
                webkitRelativePath: 'test_duplicate_files/app1/__init__.py',
                content: `# App1 initialization
from .models import User`
            },
            {
                name: '__init__.py',
                webkitRelativePath: 'test_duplicate_files/app2/__init__.py',
                content: `# App2 initialization
from .models import Product`
            },
            {
                name: '__init__.py',
                webkitRelativePath: 'test_duplicate_files/utils/__init__.py',
                content: `# Utils package initialization
from .utils import subdirectory_utility_function`
            }
        ];
        
        // Create File objects from the hardcoded content
        const loadedFiles = [];
        
        for (const fileInfo of testFiles) {
            console.log(`Creating file object for ${fileInfo.webkitRelativePath}...`);
            
            // Create a File object with the content
            const file = new File([fileInfo.content], fileInfo.name, { type: 'text/x-python' });
            
            // Add the webkitRelativePath property
            Object.defineProperty(file, 'webkitRelativePath', {
                value: fileInfo.webkitRelativePath,
                writable: false
            });
            
            loadedFiles.push(file);
            console.log(`Created file object for ${fileInfo.webkitRelativePath}, content length: ${fileInfo.content.length}`);
        }
        
        console.log(`Successfully created ${loadedFiles.length} test file objects`);
        
        // Display files in the list
        const fileList = document.getElementById('file-list');
        if (fileList) {
            fileList.innerHTML = '';
            
            const header = document.createElement('li');
            header.innerHTML = '<strong>Test Duplicate Files</strong>';
            fileList.appendChild(header);
            
            loadedFiles.forEach(file => {
                const li = document.createElement('li');
                li.className = 'file-item';
                li.textContent = file.webkitRelativePath;
                fileList.appendChild(li);
            });
        }
        // Update file count display
        const pythonFileCountElement = document.getElementById('python-file-count');
        if (pythonFileCountElement) {
            pythonFileCountElement.textContent = loadedFiles.length;
        }
        
        // Enable the analyze button
        const analyzeButton = document.getElementById('analyze-btn');
        if (analyzeButton) {
            analyzeButton.disabled = false;
        }
        
        
        // Parse and visualize the test files
        console.log("Parsing test files...");
        const graphData = await pythonParser.parseFiles(loadedFiles);
        graphVisualizer.update(graphData);
        
        // Show success message
        showNotification('Test duplicate files loaded and analyzed!');
        
    } catch (error) {
        console.error('Error loading test files:', error);
        showNotification('Error loading test files. See console for details.', true);
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