/**
 * Enhanced Main Application Script
 * Handles user interactions and coordinates between components
 */
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
    let allFiles = new Map();
    let subdirectories = [];
    let selectedSubdirectories = [];
    const MAX_FILE_COUNT = 300;
    const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15MB in bytes
    let totalFileSize = 0;
    
    // Analysis state
    let currentAnalysis = null;
    let analysisHistory = [];
    
    // Common directories to ignore
    const COMMON_IGNORE_DIRS = [
        '.venv', 'venv', 'env',
        'node_modules',
        '__pycache__',
        '.git', '.github',
        'build', 'dist',
        '.idea', '.vscode',
        'tests', 'test',
        '.pytest_cache',
        '.mypy_cache',
        'migrations',
        'locale'
    ];
    
    // Initialize the graph visualizer
    graphVisualizer.initialize();
    
    // Set up progress indicator
    setupProgressIndicator();
    
    // Set up metrics dashboard
    setupMetricsDashboard();
    
    // Set up analysis history
    setupAnalysisHistory();
    
    // Set up keyboard shortcuts help
    setupKeyboardShortcutsHelp();
    
    // Handle individual file selection
    fileInput.addEventListener('change', function(e) {
        const newFiles = Array.from(e.target.files);
        
        const pythonFiles = newFiles.filter(file => file.name.endsWith('.py'));
        
        if (pythonFiles.length === 0) {
            showNotification('No Python files selected. Please select .py files.', true);
            return;
        }
        
        addFilesToCollection(pythonFiles);
        fileInput.value = '';
    });
    
    // Handle directory selection
    directoryInput.addEventListener('change', function(e) {
        const newFiles = Array.from(e.target.files);
        
        const pythonFiles = newFiles.filter(file => file.name.endsWith('.py'));
        
        if (pythonFiles.length === 0) {
            showNotification('No Python files found in the selected directory.', true);
            return;
        }
        
        const dirFiles = [...newFiles];
        extractSubdirectories(dirFiles);
        
        if (subdirectories.length > 1 && pythonFiles.length > MAX_FILE_COUNT) {
            const tempFiles = [...newFiles];
            showSubdirectoryModal(tempFiles);
        } else {
            addFilesToCollection(pythonFiles);
        }
        
        directoryInput.value = '';
    });
    
    // Handle clear selection button
    clearSelectionBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all selected files?')) {
            clearFileSelection();
        }
    });
    
    // Handle analyze button click
    analyzeBtn.addEventListener('click', async function() {
        if (selectedFiles.length > 0) {
            if (selectedFiles.length > MAX_FILE_COUNT) {
                showNotification(`Error: Cannot analyze. The number of files (${selectedFiles.length}) exceeds the maximum limit of ${MAX_FILE_COUNT} files.`, true);
                return;
            }
            
            if (totalFileSize > MAX_TOTAL_SIZE) {
                const totalSizeMB = (totalFileSize / (1024 * 1024)).toFixed(2);
                const maxSizeMB = (MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(0);
                showNotification(`Error: Cannot analyze. The total file size (${totalSizeMB}MB) exceeds the maximum limit of ${maxSizeMB}MB.`, true);
                return;
            }
            
            await performAnalysis();
        }
    });
    
    // Listen for parse progress events
    document.addEventListener('parseProgress', function(event) {
        updateProgressIndicator(event.detail);
    });
    
    /**
     * Perform codebase analysis
     */
    async function performAnalysis() {
        showProgressIndicator();
        showNotification('Starting codebase analysis...');
        
        const startTime = performance.now();
        
        try {
            // Parse files and generate graph
            const graphData = await pythonParser.parseFiles(selectedFiles);
            
            const endTime = performance.now();
            const analysisTime = ((endTime - startTime) / 1000).toFixed(2);
            
            // Store current analysis
            currentAnalysis = {
                timestamp: new Date(),
                fileCount: selectedFiles.length,
                totalSize: totalFileSize,
                analysisTime: analysisTime,
                metrics: graphData.metrics,
                graphData: graphData
            };
            
            // Add to history
            addToAnalysisHistory(currentAnalysis);
            
            // Update visualization
            graphVisualizer.update(graphData);
            
            // Update metrics dashboard
            updateMetricsDashboard(graphData.metrics);
            
            // Show success notification
            showNotification(`Analysis complete! Processed ${selectedFiles.length} files in ${analysisTime}s`);
            
            // Show insights
            showAnalysisInsights(graphData.metrics);
            
        } catch (error) {
            console.error('Error during analysis:', error);
            showNotification('Error during analysis. Please check the console for details.', true);
        } finally {
            hideProgressIndicator();
        }
    }
    
    /**
     * Setup progress indicator
     */
    function setupProgressIndicator() {
        const progressContainer = document.createElement('div');
        progressContainer.id = 'analysis-progress';
        progressContainer.className = 'analysis-progress';
        progressContainer.innerHTML = `
            <div class="progress-content">
                <h4>Analyzing Codebase...</h4>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-info">
                    <span id="progress-current">0</span> / <span id="progress-total">0</span> files
                    (<span id="progress-percentage">0</span>%)
                </div>
            </div>
        `;
        progressContainer.style.display = 'none';
        document.body.appendChild(progressContainer);
    }
    
    /**
     * Show progress indicator
     */
    function showProgressIndicator() {
        const indicator = document.getElementById('analysis-progress');
        indicator.style.display = 'flex';
    }
    
    /**
     * Hide progress indicator
     */
    function hideProgressIndicator() {
        const indicator = document.getElementById('analysis-progress');
        indicator.style.display = 'none';
    }
    
    /**
     * Update progress indicator
     */
    function updateProgressIndicator(progress) {
        document.getElementById('progress-current').textContent = progress.current;
        document.getElementById('progress-total').textContent = progress.total;
        document.getElementById('progress-percentage').textContent = progress.percentage;
        
        const progressFill = document.querySelector('.progress-fill');
        progressFill.style.width = `${progress.percentage}%`;
    }
    
    /**
     * Setup metrics dashboard
     */
    function setupMetricsDashboard() {
        const dashboard = document.createElement('div');
        dashboard.id = 'metrics-dashboard';
        dashboard.className = 'metrics-dashboard';
        dashboard.innerHTML = `
            <h3>Codebase Metrics</h3>
            <div id="metrics-content" class="metrics-content">
                <p>Analyze a codebase to see metrics</p>
            </div>
        `;
        
        const detailsPanel = document.querySelector('.details-panel');
        detailsPanel.appendChild(dashboard);
    }
    
    /**
     * Update metrics dashboard
     */
    function updateMetricsDashboard(metrics) {
        if (!metrics || !metrics.overall) return;
        
        const overall = metrics.overall;
        const content = document.getElementById('metrics-content');
        
        // Calculate code health indicators
        const avgComplexityStatus = overall.avg_complexity < 5 ? 'good' : 
                                   overall.avg_complexity < 10 ? 'warning' : 'danger';
        const qualityStatus = overall.avg_quality_score > 70 ? 'good' : 
                             overall.avg_quality_score > 50 ? 'warning' : 'danger';
        const testCoverageStatus = overall.test_coverage_estimate > 60 ? 'good' : 
                                  overall.test_coverage_estimate > 30 ? 'warning' : 'danger';
        
        content.innerHTML = `
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${overall.total_files}</div>
                    <div class="metric-label">Total Files</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${overall.total_code_lines.toLocaleString()}</div>
                    <div class="metric-label">Lines of Code</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${overall.total_functions}</div>
                    <div class="metric-label">Functions</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${overall.total_classes}</div>
                    <div class="metric-label">Classes</div>
                </div>
            </div>
            
            <div class="health-indicators">
                <h4>Code Health</h4>
                <div class="health-item">
                    <span class="health-label">Average Complexity:</span>
                    <span class="health-value ${avgComplexityStatus}">${overall.avg_complexity.toFixed(1)}</span>
                    <div class="health-bar">
                        <div class="health-fill ${avgComplexityStatus}" style="width: ${Math.min(100, overall.avg_complexity * 10)}%"></div>
                    </div>
                </div>
                <div class="health-item">
                    <span class="health-label">Quality Score:</span>
                    <span class="health-value ${qualityStatus}">${overall.avg_quality_score.toFixed(0)}%</span>
                    <div class="health-bar">
                        <div class="health-fill ${qualityStatus}" style="width: ${overall.avg_quality_score}%"></div>
                    </div>
                </div>
                <div class="health-item">
                    <span class="health-label">Test Coverage (Est.):</span>
                    <span class="health-value ${testCoverageStatus}">${overall.test_coverage_estimate}%</span>
                    <div class="health-bar">
                        <div class="health-fill ${testCoverageStatus}" style="width: ${overall.test_coverage_estimate}%"></div>
                    </div>
                </div>
            </div>
            
            ${overall.total_todos > 0 ? `
            <div class="todo-summary">
                <h4>TODOs Found: ${overall.total_todos}</h4>
                <p>Review the graph to see TODO markers in your code.</p>
            </div>
            ` : ''}
            
            ${overall.files_with_errors > 0 ? `
            <div class="error-summary">
                <h4>Files with Errors: ${overall.files_with_errors}</h4>
                <p>Some files couldn't be parsed completely. Check for syntax errors.</p>
            </div>
            ` : ''}
            
            <div class="metrics-actions">
                <button onclick="exportMetricsReport()" class="secondary-btn">Export Report</button>
                <button onclick="showDetailedMetrics()" class="secondary-btn">Detailed View</button>
            </div>
        `;
    }
    
    /**
     * Show analysis insights
     */
    function showAnalysisInsights(metrics) {
        if (!metrics || !metrics.overall) return;
        
        const insights = [];
        const overall = metrics.overall;
        
        // Complexity insights
        if (overall.avg_complexity > 10) {
            insights.push({
                type: 'warning',
                title: 'High Complexity Detected',
                message: `Average function complexity is ${overall.avg_complexity.toFixed(1)}. Consider refactoring complex functions.`
            });
        }
        
        if (overall.max_complexity > 20) {
            insights.push({
                type: 'danger',
                title: 'Very Complex Functions',
                message: `Maximum complexity reached ${overall.max_complexity}. This may indicate code that's hard to maintain.`
            });
        }
        
        // Quality insights
        if (overall.avg_quality_score < 50) {
            insights.push({
                type: 'warning',
                title: 'Low Code Quality',
                message: 'Consider adding docstrings, type annotations, and reducing complexity.'
            });
        }
        
        // Test coverage insights
        if (overall.test_coverage_estimate < 30) {
            insights.push({
                type: 'warning',
                title: 'Low Test Coverage',
                message: `Only ${overall.test_coverage_estimate}% estimated test coverage. Consider adding more tests.`
            });
        }
        
        // TODO insights
        if (overall.total_todos > 10) {
            insights.push({
                type: 'info',
                title: 'Multiple TODOs',
                message: `Found ${overall.total_todos} TODO comments. Consider creating issues to track them.`
            });
        }
        
        // Show insights
        if (insights.length > 0) {
            showInsightsModal(insights);
        }
    }
    
    /**
     * Show insights modal
     */
    function showInsightsModal(insights) {
        const modal = document.createElement('div');
        modal.className = 'modal insights-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Analysis Insights</h3>
                    <span class="close-modal" onclick="this.closest('.modal').remove()">×</span>
                </div>
                <div class="modal-body">
                    ${insights.map(insight => `
                        <div class="insight-item ${insight.type}">
                            <h4>${insight.title}</h4>
                            <p>${insight.message}</p>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 10000);
    }
    
    /**
     * Setup analysis history
     */
    function setupAnalysisHistory() {
        const historyContainer = document.createElement('div');
        historyContainer.className = 'analysis-history';
        historyContainer.innerHTML = `
            <h4>Analysis History</h4>
            <div id="history-list" class="history-list">
                <p>No analysis performed yet</p>
            </div>
        `;
        
        const inputSection = document.querySelector('.input-section');
        inputSection.appendChild(historyContainer);
    }
    
    /**
     * Add to analysis history
     */
    function addToAnalysisHistory(analysis) {
        analysisHistory.unshift(analysis);
        
        // Keep only last 5 analyses
        if (analysisHistory.length > 5) {
            analysisHistory = analysisHistory.slice(0, 5);
        }
        
        updateHistoryDisplay();
    }
    
    /**
     * Update history display
     */
    function updateHistoryDisplay() {
        const historyList = document.getElementById('history-list');
        
        if (analysisHistory.length === 0) {
            historyList.innerHTML = '<p>No analysis performed yet</p>';
            return;
        }
        
        historyList.innerHTML = analysisHistory.map((analysis, index) => `
            <div class="history-item" onclick="loadAnalysis(${index})">
                <div class="history-time">${analysis.timestamp.toLocaleString()}</div>
                <div class="history-info">
                    ${analysis.fileCount} files • ${(analysis.totalSize / (1024 * 1024)).toFixed(1)}MB • ${analysis.analysisTime}s
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Setup keyboard shortcuts help
     */
    function setupKeyboardShortcutsHelp() {
        const helpButton = document.createElement('button');
        helpButton.className = 'help-button';
        helpButton.innerHTML = '?';
        helpButton.title = 'Keyboard Shortcuts';
        helpButton.onclick = showKeyboardShortcuts;
        
        document.body.appendChild(helpButton);
    }
    
    /**
     * Show keyboard shortcuts
     */
    function showKeyboardShortcuts() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Keyboard Shortcuts</h3>
                    <span class="close-modal" onclick="this.closest('.modal').remove()">×</span>
                </div>
                <div class="modal-body">
                    <div class="shortcuts-grid">
                        <div class="shortcut">
                            <kbd>Ctrl+F</kbd>
                            <span>Search nodes</span>
                        </div>
                        <div class="shortcut">
                            <kbd>L</kbd>
                            <span>Toggle labels</span>
                        </div>
                        <div class="shortcut">
                            <kbd>M</kbd>
                            <span>Toggle metrics</span>
                        </div>
                        <div class="shortcut">
                            <kbd>+/-</kbd>
                            <span>Zoom in/out</span>
                        </div>
                        <div class="shortcut">
                            <kbd>Ctrl+0</kbd>
                            <span>Reset zoom</span>
                        </div>
                        <div class="shortcut">
                            <kbd>Esc</kbd>
                            <span>Clear selection</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }
    
    /**
     * Extract subdirectories from files
     */
    function extractSubdirectories(files) {
        subdirectories = [];
        const dirSet = new Set();
        
        files.forEach(file => {
            const path = file.webkitRelativePath || file.name;
            const pathParts = path.split('/');
            
            if (pathParts.length > 1) {
                dirSet.add(pathParts[0]);
            }
        });
        
        subdirectories = Array.from(dirSet).sort();
        selectedSubdirectories = [...subdirectories];
    }
    
    /**
     * Show the subdirectory selection modal
     */
    function showSubdirectoryModal(tempFiles) {
        const modal = document.getElementById('subdirectory-modal');
        const subdirList = document.getElementById('subdirectory-list');
        const closeBtn = document.querySelector('.close-modal');
        const confirmBtn = document.getElementById('confirm-subdirectory-btn');
        const cancelBtn = document.getElementById('cancel-subdirectory-btn');
        const ignoreCommonBtn = document.getElementById('ignore-common-btn');
        
        subdirList.innerHTML = '';
        
        // Sort subdirectories and add indicators
        const sortedDirs = subdirectories.sort((a, b) => {
            // Common dirs at bottom
            const aIsCommon = COMMON_IGNORE_DIRS.some(d => a.toLowerCase().includes(d));
            const bIsCommon = COMMON_IGNORE_DIRS.some(d => b.toLowerCase().includes(d));
            
            if (aIsCommon && !bIsCommon) return 1;
            if (!aIsCommon && bIsCommon) return -1;
            
            return a.localeCompare(b);
        });
        
        sortedDirs.forEach(dir => {
            const item = document.createElement('div');
            item.className = 'checkbox-item';
            
            const isCommon = COMMON_IGNORE_DIRS.some(d => dir.toLowerCase().includes(d));
            const fileCount = countPythonFilesInDir(dir, tempFiles);
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `dir-${dir}`;
            checkbox.value = dir;
            checkbox.checked = selectedSubdirectories.includes(dir) && !isCommon;
            
            const label = document.createElement('label');
            label.htmlFor = `dir-${dir}`;
            label.innerHTML = `
                ${dir} 
                <span class="file-count">(${fileCount} files)</span>
                ${isCommon ? '<span class="common-indicator">common</span>' : ''}
            `;
            
            item.appendChild(checkbox);
            item.appendChild(label);
            subdirList.appendChild(item);
            
            checkbox.addEventListener('change', function() {
                updateSelectedFileCount(tempFiles);
            });
        });
        
        modal.style.display = 'block';
        updateSelectedFileCount(tempFiles);
        
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
        
        ignoreCommonBtn.onclick = function() {
            ignoreCommonDirectories();
            updateSelectedFileCount(tempFiles);
        };
        
        confirmBtn.onclick = function() {
            const selectedDirs = [];
            const checkboxes = subdirList.querySelectorAll('input[type="checkbox"]');
            
            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    selectedDirs.push(checkbox.value);
                }
            });
            
            selectedSubdirectories = selectedDirs;
            
            const filteredFiles = filterFilesBySubdirectories(tempFiles);
            
            const errorMsg = document.querySelector('.error-message') || document.createElement('div');
            errorMsg.className = 'error-message';
            
            if (filteredFiles.length > MAX_FILE_COUNT) {
                errorMsg.textContent = `Too many files selected (${filteredFiles.length}). Please select fewer subdirectories to stay under the limit of ${MAX_FILE_COUNT} files.`;
                errorMsg.style.display = 'block';
                
                if (!document.querySelector('.error-message')) {
                    const modalBody = document.querySelector('.modal-body');
                    modalBody.insertBefore(errorMsg, modalBody.firstChild);
                }
                
                return;
            } else if (filteredFiles.length === 0) {
                errorMsg.textContent = 'No Python files selected. Please select at least one subdirectory containing Python files.';
                errorMsg.style.display = 'block';
                
                if (!document.querySelector('.error-message')) {
                    const modalBody = document.querySelector('.modal-body');
                    modalBody.insertBefore(errorMsg, modalBody.firstChild);
                }
                
                return;
            } else {
                errorMsg.style.display = 'none';
            }
            
            addFilesToCollection(filteredFiles);
            modal.style.display = 'none';
        };
        
        cancelBtn.onclick = function() {
            modal.style.display = 'none';
        };
    }
    
    /**
     * Count Python files in a specific directory
     */
    function countPythonFilesInDir(dir, files) {
        return files.filter(file => {
            const path = file.webkitRelativePath || file.name;
            return path.startsWith(dir + '/') && path.endsWith('.py');
        }).length;
    }
    
    /**
     * Update the selected file count in the modal
     */
    function updateSelectedFileCount(files) {
        const selectedDirs = [];
        const checkboxes = document.querySelectorAll('#subdirectory-list input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedDirs.push(checkbox.value);
            }
        });
        
        const count = files.filter(file => {
            const path = file.webkitRelativePath || file.name;
            const pathParts = path.split('/');
            
            return path.endsWith('.py') &&
                   pathParts.length > 1 &&
                   selectedDirs.includes(pathParts[0]);
        }).length;
        
        document.getElementById('selected-file-count').textContent = count;
        
        const confirmBtn = document.getElementById('confirm-subdirectory-btn');
        confirmBtn.disabled = count === 0 || count > MAX_FILE_COUNT;
        
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
     * Ignore common directories
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
    function filterFilesBySubdirectories(files) {
        return files.filter(file => {
            const path = file.webkitRelativePath || file.name;
            const pathParts = path.split('/');
            
            return path.endsWith('.py') &&
                   pathParts.length > 1 &&
                   selectedSubdirectories.includes(pathParts[0]);
        });
    }
    
    /**
     * Calculate the total size of files
     */
    function calculateTotalSize(files) {
        return files.reduce((total, file) => total + file.size, 0);
    }
    
    /**
     * Normalize file paths to maintain hierarchical structure
     */
    function normalizePath(path) {
        const parts = path.split('/');
        const fileName = parts[parts.length - 1];
        
        let dirPath = '';
        let displayPath = '';
        
        if (parts.length > 1) {
            dirPath = parts.slice(0, -1).join('/');
            displayPath = dirPath;
        } else {
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
     */
    function findCommonPathPrefix() {
        if (allFiles.size === 0) return '';
        
        const paths = Array.from(allFiles.keys());
        const shortestPath = paths.reduce((shortest, current) =>
            current.length < shortest.length ? current : shortest, paths[0]);
        
        const pathParts = paths.map(path => path.split('/'));
        const shortestParts = shortestPath.split('/');
        
        let commonPrefix = [];
        for (let i = 0; i < shortestParts.length - 1; i++) {
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
     */
    function findDuplicateFile(newFile) {
        const newFileName = newFile.name;
        const newFileSize = newFile.size;
        
        let potentialDuplicate = null;
        
        for (const [path, existingFile] of allFiles.entries()) {
            if (existingFile.name === newFileName && existingFile.size === newFileSize) {
                potentialDuplicate = path;
                break;
            }
        }
        
        return potentialDuplicate;
    }
    
    /**
     * Add files to the collection and update UI
     */
    function addFilesToCollection(files) {
        const currentCount = selectedFiles.length;
        
        let uniqueFiles = 0;
        let duplicateFiles = 0;
        
        const filesToAdd = [];
        const duplicatePaths = new Map();
        
        files.forEach(file => {
            const duplicatePath = findDuplicateFile(file);
            
            if (duplicatePath) {
                duplicateFiles++;
                duplicatePaths.set(file, duplicatePath);
            } else {
                uniqueFiles++;
                filesToAdd.push(file);
            }
        });
        
        const newCount = currentCount + uniqueFiles;
        
        if (newCount > MAX_FILE_COUNT) {
            showNotification(`Error: Cannot add files. The total number of files (${newCount}) would exceed the limit of ${MAX_FILE_COUNT} files.`, true);
            return;
        }
        
        const newFilesSize = calculateTotalSize(filesToAdd);
        const newTotalSize = totalFileSize + newFilesSize;
        
        if (newTotalSize > MAX_TOTAL_SIZE) {
            const currentSizeMB = (totalFileSize / (1024 * 1024)).toFixed(2);
            const newSizeMB = (newFilesSize / (1024 * 1024)).toFixed(2);
            const maxSizeMB = (MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(0);
            
            showNotification(`Error: Cannot add files. Current size: ${currentSizeMB}MB + New files: ${newSizeMB}MB would exceed the limit of ${maxSizeMB}MB.`, true);
            return;
        }
        
        filesToAdd.forEach(file => {
            const originalPath = file.webkitRelativePath || file.name;
            allFiles.set(originalPath, file);
            file.normalizedPath = normalizePath(originalPath);
            file.fullPath = originalPath;
        });
        
        totalFileSize = newTotalSize;
        selectedFiles = Array.from(allFiles.values()).filter(file => file.name.endsWith('.py'));
        
        updateFileList();
        updateFileCount();
        
        analyzeBtn.disabled = selectedFiles.length === 0;
        clearSelectionBtn.disabled = selectedFiles.length === 0;
        
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
        totalFileSize = 0;
        updateFileList();
        updateFileCount();
        
        analyzeBtn.disabled = true;
        clearSelectionBtn.disabled = true;
        
        showNotification('File selection cleared.');
    }
    
    /**
     * Update the file count display
     */
    function updateFileCount() {
        pythonFileCount.textContent = selectedFiles.length;
        
        const totalSizeMB = (totalFileSize / (1024 * 1024)).toFixed(2);
        const maxSizeMB = (MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(0);
        
        const fileCountElement = document.querySelector('.file-count');
        if (fileCountElement) {
            fileCountElement.innerHTML = `<span>${selectedFiles.length}</span> Python files selected (<span>${totalSizeMB}</span>MB of ${maxSizeMB}MB)`;
            
            // Add visual indicators
            const countPercentage = (selectedFiles.length / MAX_FILE_COUNT) * 100;
            const sizePercentage = (totalFileSize / MAX_TOTAL_SIZE) * 100;
            
            if (countPercentage > 80 || sizePercentage > 80) {
                fileCountElement.classList.add('warning');
            } else {
                fileCountElement.classList.remove('warning');
            }
        }
        
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
            li.className = 'empty-message';
            fileList.appendChild(li);
            return;
        }
        
        const commonPrefix = findCommonPathPrefix();
        const filesByDir = {};
        const directoryTree = {};
        
        selectedFiles.forEach(file => {
            const pathInfo = file.normalizedPath || normalizePath(file.webkitRelativePath || file.name);
            
            let displayPath = pathInfo.dirPath;
            if (commonPrefix && displayPath.startsWith(commonPrefix) && displayPath !== commonPrefix) {
                const topDir = commonPrefix.split('/')[0];
                displayPath = topDir + displayPath.substring(commonPrefix.length);
            }
            
            const dirKey = displayPath || '.';
            
            if (!filesByDir[dirKey]) {
                filesByDir[dirKey] = [];
                
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
        
        // Create collapsible directory structure
        Object.keys(filesByDir).sort().forEach(dir => {
            const dirLi = document.createElement('li');
            dirLi.className = 'directory';
            
            let dirName = dir === '.' ? 'Root' : dir;
            const fileCount = filesByDir[dir].length;
            const dirSize = filesByDir[dir].reduce((sum, f) => sum + f.file.size, 0);
            const dirSizeMB = (dirSize / (1024 * 1024)).toFixed(2);
            
            const dirHeader = document.createElement('div');
            dirHeader.className = 'directory-header';
            
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'toggle-btn';
            toggleBtn.textContent = '▼';
            toggleBtn.onclick = function() {
                const filesList = dirHeader.nextElementSibling;
                if (filesList.style.display === 'none') {
                    filesList.style.display = 'block';
                    toggleBtn.textContent = '▼';
                } else {
                    filesList.style.display = 'none';
                    toggleBtn.textContent = '▶';
                }
            };
            
            const dirTitle = document.createElement('span');
            dirTitle.innerHTML = `<strong>${dirName}</strong> <span class="dir-info">(${fileCount} files, ${dirSizeMB}MB)</span>`;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '×';
            removeBtn.title = 'Remove all files in this directory';
            removeBtn.addEventListener('click', function() {
                removeDirectory(dir);
            });
            
            dirHeader.appendChild(toggleBtn);
            dirHeader.appendChild(dirTitle);
            dirHeader.appendChild(removeBtn);
            dirLi.appendChild(dirHeader);
            
            fileList.appendChild(dirLi);
            
            const fileUl = document.createElement('ul');
            fileUl.className = 'file-sublist';
            
            filesByDir[dir].sort((a, b) => a.name.localeCompare(b.name)).forEach(file => {
                const fileLi = document.createElement('li');
                fileLi.className = 'file-item';
                
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item-content';
                
                const fileName = document.createElement('span');
                fileName.textContent = file.name;
                
                const fileSizeMB = (file.file.size / (1024 * 1024)).toFixed(2);
                const fileInfo = document.createElement('span');
                fileInfo.className = 'file-info';
                fileInfo.textContent = `${fileSizeMB}MB`;
                
                const removeFileBtn = document.createElement('button');
                removeFileBtn.className = 'remove-btn small';
                removeFileBtn.textContent = '×';
                removeFileBtn.title = 'Remove this file';
                removeFileBtn.addEventListener('click', function() {
                    removeFile(file.path);
                });
                
                fileItem.appendChild(fileName);
                fileItem.appendChild(fileInfo);
                fileItem.appendChild(removeFileBtn);
                fileLi.appendChild(fileItem);
                
                fileUl.appendChild(fileLi);
            });
            
            fileList.appendChild(fileUl);
        });
    }
    
    /**
     * Remove a file from the collection
     */
    function removeFile(path) {
        if (allFiles.has(path)) {
            const file = allFiles.get(path);
            const fileSize = file.size;
            
            allFiles.delete(path);
            totalFileSize -= fileSize;
            
            selectedFiles = Array.from(allFiles.values()).filter(file => file.name.endsWith('.py'));
            
            updateFileList();
            updateFileCount();
            
            analyzeBtn.disabled = selectedFiles.length === 0;
            clearSelectionBtn.disabled = selectedFiles.length === 0;
            
            showNotification('File removed from selection.');
        }
    }
    
    /**
     * Remove all files in a directory
     */
    function removeDirectory(dirPath) {
        const filesToRemove = [];
        let sizeToRemove = 0;
        
        allFiles.forEach((file, path) => {
            if (file.normalizedPath) {
                const normalizedDirPath = file.normalizedPath.displayPath;
                
                if ((dirPath === '.' && normalizedDirPath === 'Root') ||
                    (dirPath !== '.' && normalizedDirPath === dirPath)) {
                    filesToRemove.push(path);
                    sizeToRemove += file.size;
                }
            } else {
                const pathParts = path.split('/');
                const fileDirPath = pathParts.slice(0, -1).join('/') || '.';
                
                if (fileDirPath === dirPath) {
                    filesToRemove.push(path);
                    sizeToRemove += file.size;
                }
            }
        });
        
        filesToRemove.forEach(path => {
            allFiles.delete(path);
        });
        
        totalFileSize -= sizeToRemove;
        
        selectedFiles = Array.from(allFiles.values()).filter(file => file.name.endsWith('.py'));
        
        updateFileList();
        updateFileCount();
        
        analyzeBtn.disabled = selectedFiles.length === 0;
        clearSelectionBtn.disabled = selectedFiles.length === 0;
        
        showNotification(`Removed ${filesToRemove.length} files (${(sizeToRemove / (1024 * 1024)).toFixed(2)}MB) from selection.`);
    }
    
    // Add demo functionality
    setupDemoButton();
    
    // Set up GitHub repository integration
    setupGitHubIntegration();
    
    // Set up drag and drop
    setupDragAndDrop();
});

/**
 * Setup drag and drop functionality
 */
function setupDragAndDrop() {
    const dropZone = document.querySelector('.input-section');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight(e) {
        dropZone.classList.add('drag-highlight');
    }
    
    function unhighlight(e) {
        dropZone.classList.remove('drag-highlight');
    }
    
    dropZone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = Array.from(dt.files);
        
        const pythonFiles = files.filter(file => file.name.endsWith('.py'));
        
        if (pythonFiles.length === 0) {
            showNotification('No Python files found in the dropped items.', true);
            return;
        }
        
        addFilesToCollection(pythonFiles);
    }
}

/**
 * Set up GitHub repository integration
 */
function setupGitHubIntegration() {
    const githubRepoUrl = document.getElementById('github-repo-url');
    const githubFetchBtn = document.getElementById('github-fetch-btn');
    const repoInfo = document.getElementById('repo-info');
    const repoName = document.getElementById('repo-name');
    const repoStars = document.getElementById('repo-stars');
    const repoForks = document.getElementById('repo-forks');
    const repoDescription = document.getElementById('repo-description');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (!githubFetchBtn || !githubRepoUrl) {
        console.error('GitHub elements not found in the DOM');
        return;
    }
    
    if (typeof githubIntegration === 'undefined') {
        console.error('GitHub integration script not loaded');
        return;
    }
    
    // Add paste handler for quick URL entry
    githubRepoUrl.addEventListener('paste', function(e) {
        setTimeout(() => {
            const url = e.target.value.trim();
            if (url && url.includes('github.com')) {
                githubFetchBtn.classList.add('pulse');
                setTimeout(() => githubFetchBtn.classList.remove('pulse'), 1000);
            }
        }, 100);
    });
    
    githubFetchBtn.addEventListener('click', async function() {
        const url = githubRepoUrl.value.trim();
        
        if (!url) {
            showNotification('Please enter a GitHub repository URL', true);
            return;
        }
        
        try {
            loadingIndicator.style.display = 'flex';
            githubFetchBtn.disabled = true;
            
            const fileListElement = document.getElementById('file-list');
            const pythonFileCountElement = document.getElementById('python-file-count');
            const analyzeButton = document.getElementById('analyze-btn');
            
            if (fileListElement) {
                fileListElement.innerHTML = '<li>Loading repository files...</li>';
            }
            
            if (pythonFileCountElement) {
                pythonFileCountElement.textContent = '0';
            }
            
            if (analyzeButton) {
                analyzeButton.disabled = true;
            }
            
            document.getElementById('clear-selection-btn').disabled = true;
            
            const MAX_FILE_COUNT = 300;
            const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15MB in bytes
            
            const result = await githubIntegration.processRepository(url, MAX_FILE_COUNT, MAX_TOTAL_SIZE);
            
            displayRepositoryInfo(result.metadata, repoName, repoStars, repoForks, repoDescription, repoInfo);
            
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
            
            if (result.subdirectories.length > 1 && result.fileCount > MAX_FILE_COUNT / 2) {
                showGitHubSubdirectoryModal(result.subdirectories, loadingIndicator);
            } else {
                await processGitHubFiles(loadingIndicator);
            }
            
        } catch (error) {
            console.error('Error processing GitHub repository:', error);
            showNotification(`Error: ${error.message}`, true);
        } finally {
            loadingIndicator.style.display = 'none';
            githubFetchBtn.disabled = false;
        }
    });
}

/**
 * Display repository information
 */
function displayRepositoryInfo(metadata, nameElement, starsElement, forksElement, descriptionElement, infoContainer) {
    nameElement.textContent = metadata.name;
    starsElement.textContent = metadata.stargazers_count.toLocaleString();
    forksElement.textContent = metadata.forks_count.toLocaleString();
    descriptionElement.textContent = metadata.description || 'No description available';
    
    infoContainer.style.display = 'block';
}

/**
 * Show subdirectory selection modal for GitHub repositories
 */
function showGitHubSubdirectoryModal(subdirectories, loadingIndicator) {
    const modal = document.getElementById('subdirectory-modal');
    const subdirList = document.getElementById('subdirectory-list');
    const closeBtn = document.querySelector('.close-modal');
    const confirmBtn = document.getElementById('confirm-subdirectory-btn');
    const cancelBtn = document.getElementById('cancel-subdirectory-btn');
    const ignoreCommonBtn = document.getElementById('ignore-common-btn');
    
    subdirList.innerHTML = '';
    
    subdirectories.forEach(dir => {
        const item = document.createElement('div');
        item.className = 'checkbox-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `dir-${dir}`;
        checkbox.value = dir;
        checkbox.checked = true;
        
        const label = document.createElement('label');
        label.htmlFor = `dir-${dir}`;
        label.textContent = dir;
        
        item.appendChild(checkbox);
        item.appendChild(label);
        subdirList.appendChild(item);
    });
    
    modal.style.display = 'block';
    
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    
    ignoreCommonBtn.onclick = function() {
        const COMMON_IGNORE_DIRS = [
            '.venv', 'venv', 'env',
            'node_modules',
            '__pycache__',
            '.git', '.github',
            'build', 'dist',
            '.idea', '.vscode',
            'tests', 'test'
        ];
        
        const checkboxes = subdirList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (COMMON_IGNORE_DIRS.some(ignoreDir =>
                checkbox.value.toLowerCase().includes(ignoreDir.toLowerCase()))) {
                checkbox.checked = false;
            }
        });
    };
    
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
        
        loadingIndicator.style.display = 'flex';
        
        try {
            const MAX_FILE_COUNT = 300;
            const MAX_TOTAL_SIZE = 15 * 1024 * 1024;
            
            await githubIntegration.processSelectedDirectories(selectedDirs, MAX_FILE_COUNT, MAX_TOTAL_SIZE);
            await processGitHubFiles(loadingIndicator);
            
            modal.style.display = 'none';
        } catch (error) {
            console.error('Error processing selected directories:', error);
            showNotification(`Error: ${error.message}`, true);
        } finally {
            loadingIndicator.style.display = 'none';
        }
    };
    
    cancelBtn.onclick = function() {
        modal.style.display = 'none';
    };
}

/**
 * Process GitHub files and update UI
 */
async function processGitHubFiles(loadingIndicator) {
    try {
        showNotification('Preparing files for analysis...');
        
        const fileObjects = await githubIntegration.prepareFilesForAnalysis();
        
        if (fileObjects.length === 0) {
            showNotification('No Python files found in the repository', true);
            return;
        }
        
        const fileList = document.getElementById('file-list');
        if (fileList) {
            fileList.innerHTML = '';
            
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
        
        const pythonFileCountElement = document.getElementById('python-file-count');
        if (pythonFileCountElement) {
            pythonFileCountElement.textContent = fileObjects.length;
        }
        
        const analyzeButton = document.getElementById('analyze-btn');
        if (analyzeButton) {
            analyzeButton.disabled = false;
        }
        
        showNotification(`${fileObjects.length} Python files loaded from GitHub repository`);
        
        // Automatically trigger analysis
        if (fileObjects.length > 0 && analyzeButton && !analyzeButton.disabled) {
            setTimeout(async () => {
                showNotification(`Analyzing ${fileObjects.length} Python files...`);
                
                const graphData = await pythonParser.parseFiles(fileObjects);
                graphVisualizer.update(graphData);
                
                // Update metrics dashboard
                if (graphData.metrics) {
                    updateMetricsDashboard(graphData.metrics);
                }
                
                showNotification('GitHub repository analysis complete!');
            }, 500);
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
    const controlsDiv = document.querySelector('.controls');
    const demoBtn = document.createElement('button');
    demoBtn.id = 'demo-btn';
    demoBtn.textContent = 'Load Demo Project';
    demoBtn.className = 'secondary-btn';
    controlsDiv.appendChild(demoBtn);
    
    demoBtn.addEventListener('click', function() {
        loadSampleCode();
    });
}

/**
 * Load sample Python code
 */
async function loadSampleCode() {
    try {
        console.log("Loading demo project...");
        
        // Create a comprehensive demo project
        const demoFiles = [
            {
                name: 'main.py',
                webkitRelativePath: 'demo_project/main.py',
                content: `"""
Main entry point for the demo application.
This module demonstrates various Python features and patterns.
"""

import asyncio
from typing import Optional
from core.app import Application
from core.config import Config
from utils.logger import Logger

# Global logger instance
logger = Logger(__name__)

def main() -> None:
    """Initialize and run the application."""
    # TODO: Add command line argument parsing
    config = Config.from_file("config.yaml")
    app = Application(config)
    
    try:
        logger.info("Starting application...")
        app.run()
    except Exception as e:
        logger.error(f"Application failed: {e}")
        raise
    finally:
        app.cleanup()

async def async_main() -> None:
    """Async entry point for the application."""
    # FIXME: Implement proper async initialization
    config = await Config.async_from_file("config.yaml")
    app = Application(config)
    await app.async_run()

if __name__ == "__main__":
    # Check if we should run in async mode
    if Config.ASYNC_MODE:
        asyncio.run(async_main())
    else:
        main()
`
            },
            {
                name: '__init__.py',
                webkitRelativePath: 'demo_project/core/__init__.py',
                content: `"""Core package for the demo application."""

from .app import Application
from .config import Config
from .database import Database

__all__ = ['Application', 'Config', 'Database']
__version__ = '1.0.0'
`
            },
            {
                name: 'app.py',
                webkitRelativePath: 'demo_project/core/app.py',
                content: `"""
Application core module.
Handles the main application logic and lifecycle.
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from .config import Config
from .database import Database
from ..services.user_service import UserService
from ..services.product_service import ProductService

@dataclass
class ApplicationState:
    """Represents the current state of the application."""
    is_running: bool = False
    connected_users: int = 0
    processed_requests: int = 0

class Application:
    """Main application class that orchestrates all components."""
    
    def __init__(self, config: Config):
        """
        Initialize the application with given configuration.
        
        Args:
            config: Application configuration object
        """
        self.config = config
        self.database = Database(config.database_url)
        self.user_service = UserService(self.database)
        self.product_service = ProductService(self.database)
        self.state = ApplicationState()
        self._middleware: List[Any] = []
    
    def add_middleware(self, middleware: Any) -> None:
        """Add middleware to the application pipeline."""
        self._middleware.append(middleware)
    
    def run(self) -> None:
        """Run the application."""
        self.state.is_running = True
        self._initialize_services()
        self._start_server()
    
    async def async_run(self) -> None:
        """Run the application asynchronously."""
        self.state.is_running = True
        await self._async_initialize_services()
        await self._async_start_server()
    
    def cleanup(self) -> None:
        """Clean up resources."""
        self.state.is_running = False
        self.database.close()
    
    def _initialize_services(self) -> None:
        """Initialize all application services."""
        self.user_service.initialize()
        self.product_service.initialize()
    
    async def _async_initialize_services(self) -> None:
        """Initialize all application services asynchronously."""
        await self.user_service.async_initialize()
        await self.product_service.async_initialize()
    
    def _start_server(self) -> None:
        """Start the application server."""
        # TODO: Implement server startup logic
        pass
    
    async def _async_start_server(self) -> None:
        """Start the application server asynchronously."""
        # TODO: Implement async server startup logic
        pass
    
    @property
    def status(self) -> Dict[str, Any]:
        """Get current application status."""
        return {
            'running': self.state.is_running,
            'users': self.state.connected_users,
            'requests': self.state.processed_requests
        }
`
            },
            {
                name: 'config.py',
                webkitRelativePath: 'demo_project/core/config.py',
                content: `"""
Configuration management module.
Handles loading and validation of application settings.
"""

import os
import yaml
from typing import Dict, Any, Optional
from pathlib import Path

class ConfigError(Exception):
    """Raised when configuration is invalid."""
    pass

class Config:
    """Application configuration handler."""
    
    # Class constants
    ASYNC_MODE = os.getenv('ASYNC_MODE', 'false').lower() == 'true'
    DEFAULT_DATABASE_URL = 'sqlite:///app.db'
    
    def __init__(self, data: Dict[str, Any]):
        """Initialize configuration with data dictionary."""
        self._data = data
        self._validate()
    
    @classmethod
    def from_file(cls, filepath: str) -> 'Config':
        """Load configuration from file."""
        path = Path(filepath)
        if not path.exists():
            raise ConfigError(f"Config file not found: {filepath}")
        
        with open(path, 'r') as f:
            data = yaml.safe_load(f)
        
        return cls(data)
    
    @classmethod
    async def async_from_file(cls, filepath: str) -> 'Config':
        """Load configuration from file asynchronously."""
        # In real implementation, this would use aiofiles
        return cls.from_file(filepath)
    
    def _validate(self) -> None:
        """Validate configuration data."""
        required_keys = ['app_name', 'version', 'database']
        for key in required_keys:
            if key not in self._data:
                raise ConfigError(f"Missing required config key: {key}")
    
    @property
    def database_url(self) -> str:
        """Get database URL."""
        return self._data.get('database', {}).get('url', self.DEFAULT_DATABASE_URL)
    
    @property
    def debug_mode(self) -> bool:
        """Check if debug mode is enabled."""
        return self._data.get('debug', False)
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value by key."""
        return self._data.get(key, default)
`
            },
            {
                name: 'database.py',
                webkitRelativePath: 'demo_project/core/database.py',
                content: `"""
Database connection and management module.
Provides abstraction layer for database operations.
"""

from typing import Dict, List, Any, Optional, Generator
from contextlib import contextmanager
import sqlite3

class DatabaseError(Exception):
    """Raised when database operation fails."""
    pass

class Database:
    """Database connection handler with connection pooling."""
    
    def __init__(self, connection_url: str):
        """Initialize database with connection URL."""
        self.connection_url = connection_url
        self._connection: Optional[sqlite3.Connection] = None
        self._transaction_count = 0
    
    def connect(self) -> None:
        """Establish database connection."""
        try:
            self._connection = sqlite3.connect(self.connection_url)
            self._connection.row_factory = sqlite3.Row
        except sqlite3.Error as e:
            raise DatabaseError(f"Failed to connect: {e}")
    
    def close(self) -> None:
        """Close database connection."""
        if self._connection:
            self._connection.close()
            self._connection = None
    
    @contextmanager
    def transaction(self) -> Generator[None, None, None]:
        """Context manager for database transactions."""
        self._transaction_count += 1
        try:
            yield
            self._connection.commit()
        except Exception:
            self._connection.rollback()
            raise
        finally:
            self._transaction_count -= 1
    
    def execute(self, query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Execute a database query."""
        if not self._connection:
            self.connect()
        
        cursor = self._connection.cursor()
        cursor.execute(query, params or {})
        
        return [dict(row) for row in cursor.fetchall()]
    
    def execute_many(self, query: str, params_list: List[Dict[str, Any]]) -> None:
        """Execute multiple queries with different parameters."""
        if not self._connection:
            self.connect()
        
        cursor = self._connection.cursor()
        cursor.executemany(query, params_list)
        self._connection.commit()
    
    @property
    def in_transaction(self) -> bool:
        """Check if currently in a transaction."""
        return self._transaction_count > 0
`
            },
            {
                name: '__init__.py',
                webkitRelativePath: 'demo_project/services/__init__.py',
                content: `"""Services package containing business logic."""

from .user_service import UserService
from .product_service import ProductService

__all__ = ['UserService', 'ProductService']
`
            },
            {
                name: 'user_service.py',
                webkitRelativePath: 'demo_project/services/user_service.py',
                content: `"""
User service module.
Handles user-related business logic.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from ..models.user import User
from ..core.database import Database

class UserService:
    """Service for managing users."""
    
    def __init__(self, database: Database):
        """Initialize user service with database."""
        self.database = database
        self._cache: Dict[int, User] = {}
    
    def initialize(self) -> None:
        """Initialize the user service."""
        self._create_tables()
    
    async def async_initialize(self) -> None:
        """Initialize the user service asynchronously."""
        # In real implementation, this would use async database operations
        self._create_tables()
    
    def _create_tables(self) -> None:
        """Create necessary database tables."""
        query = """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
        self.database.execute(query)
    
    def create_user(self, username: str, email: str) -> User:
        """Create a new user."""
        user = User(username=username, email=email)
        query = "INSERT INTO users (username, email) VALUES (:username, :email)"
        self.database.execute(query, {'username': username, 'email': email})
        return user
    
    def get_user(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        # Check cache first
        if user_id in self._cache:
            return self._cache[user_id]
        
        query = "SELECT * FROM users WHERE id = :id"
        results = self.database.execute(query, {'id': user_id})
        
        if results:
            user = User.from_dict(results[0])
            self._cache[user_id] = user
            return user
        
        return None
    
    def get_all_users(self) -> List[User]:
        """Get all users."""
        query = "SELECT * FROM users"
        results = self.database.execute(query)
        return [User.from_dict(row) for row in results]
    
    def update_user(self, user_id: int, **kwargs) -> Optional[User]:
        """Update user information."""
        user = self.get_user(user_id)
        if not user:
            return None
        
        for key, value in kwargs.items():
            setattr(user, key, value)
        
        # Update in database
        # TODO: Implement database update logic
        
        # Update cache
        self._cache[user_id] = user
        return user
    
    def delete_user(self, user_id: int) -> bool:
        """Delete a user."""
        query = "DELETE FROM users WHERE id = :id"
        self.database.execute(query, {'id': user_id})
        
        # Remove from cache
        if user_id in self._cache:
            del self._cache[user_id]
        
        return True
`
            },
            {
                name: 'product_service.py',
                webkitRelativePath: 'demo_project/services/product_service.py',
                content: `"""
Product service module.
Handles product-related business logic.
"""

from typing import List, Optional, Dict, Any
from decimal import Decimal
from ..models.product import Product
from ..core.database import Database

class ProductService:
    """Service for managing products."""
    
    def __init__(self, database: Database):
        """Initialize product service with database."""
        self.database = database
        self._inventory: Dict[int, int] = {}  # product_id -> quantity
    
    def initialize(self) -> None:
        """Initialize the product service."""
        self._create_tables()
        self._load_inventory()
    
    async def async_initialize(self) -> None:
        """Initialize the product service asynchronously."""
        self._create_tables()
        await self._async_load_inventory()
    
    def _create_tables(self) -> None:
        """Create necessary database tables."""
        query = """
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            category TEXT,
            in_stock BOOLEAN DEFAULT TRUE
        )
        """
        self.database.execute(query)
    
    def _load_inventory(self) -> None:
        """Load inventory data from database."""
        # TODO: Implement inventory loading
        pass
    
    async def _async_load_inventory(self) -> None:
        """Load inventory data asynchronously."""
        # TODO: Implement async inventory loading
        pass
    
    def create_product(self, name: str, price: Decimal, category: str = None) -> Product:
        """Create a new product."""
        product = Product(name=name, price=price, category=category)
        query = """
        INSERT INTO products (name, price, category) 
        VALUES (:name, :price, :category)
        """
        self.database.execute(query, {
            'name': name,
            'price': str(price),
            'category': category
        })
        return product
    
    def get_product(self, product_id: int) -> Optional[Product]:
        """Get product by ID."""
        query = "SELECT * FROM products WHERE id = :id"
        results = self.database.execute(query, {'id': product_id})
        
        if results:
            return Product.from_dict(results[0])
        
        return None
    
    def search_products(self, query: str) -> List[Product]:
        """Search products by name or category."""
        sql = """
        SELECT * FROM products 
        WHERE name LIKE :query OR category LIKE :query
        """
        results = self.database.execute(sql, {'query': f'%{query}%'})
        return [Product.from_dict(row) for row in results]
    
    def get_products_by_category(self, category: str) -> List[Product]:
        """Get all products in a category."""
        query = "SELECT * FROM products WHERE category = :category"
        results = self.database.execute(query, {'category': category})
        return [Product.from_dict(row) for row in results]
    
    def update_inventory(self, product_id: int, quantity: int) -> None:
        """Update product inventory."""
        self._inventory[product_id] = quantity
        
        # Update database
        query = "UPDATE products SET in_stock = :in_stock WHERE id = :id"
        self.database.execute(query, {
            'id': product_id,
            'in_stock': quantity > 0
        })
    
    def get_inventory(self, product_id: int) -> int:
        """Get current inventory for a product."""
        return self._inventory.get(product_id, 0)
`
            },
            {
                name: '__init__.py',
                webkitRelativePath: 'demo_project/models/__init__.py',
                content: `"""Models package containing data models."""

from .user import User
from .product import Product

__all__ = ['User', 'Product']
`
            },
            {
                name: 'user.py',
                webkitRelativePath: 'demo_project/models/user.py',
                content: `"""
User model definition.
Represents a user in the system.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any

@dataclass
class User:
    """User data model."""
    
    username: str
    email: str
    id: Optional[int] = None
    created_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True
    
    def __post_init__(self):
        """Validate user data after initialization."""
        if not self.username:
            raise ValueError("Username cannot be empty")
        
        if not self.email or '@' not in self.email:
            raise ValueError("Invalid email address")
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        """Create User instance from dictionary."""
        return cls(
            id=data.get('id'),
            username=data['username'],
            email=data['email'],
            created_at=data.get('created_at', datetime.now()),
            is_active=data.get('is_active', True)
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert User instance to dictionary."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat(),
            'is_active': self.is_active
        }
    
    def __str__(self) -> str:
        """String representation of the user."""
        return f"User({self.username}, {self.email})"
    
    def __repr__(self) -> str:
        """Detailed representation of the user."""
        return f"User(id={self.id}, username='{self.username}', email='{self.email}')"
`
            },
            {
                name: 'product.py',
                webkitRelativePath: 'demo_project/models/product.py',
                content: `"""
Product model definition.
Represents a product in the system.
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import Optional, Dict, Any

@dataclass
class Product:
    """Product data model."""
    
    name: str
    price: Decimal
    id: Optional[int] = None
    category: Optional[str] = None
    in_stock: bool = True
    
    def __post_init__(self):
        """Validate product data after initialization."""
        if not self.name:
            raise ValueError("Product name cannot be empty")
        
        if self.price < 0:
            raise ValueError("Product price cannot be negative")
        
        # Ensure price is Decimal
        if not isinstance(self.price, Decimal):
            self.price = Decimal(str(self.price))
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Product':
        """Create Product instance from dictionary."""
        return cls(
            id=data.get('id'),
            name=data['name'],
            price=Decimal(data['price']),
            category=data.get('category'),
            in_stock=data.get('in_stock', True)
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert Product instance to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'price': str(self.price),
            'category': self.category,
            'in_stock': self.in_stock
        }
    
    def apply_discount(self, percentage: float) -> Decimal:
        """Apply a percentage discount to the product price."""
        discount = self.price * Decimal(str(percentage / 100))
        return self.price - discount
    
    def __str__(self) -> str:
        """String representation of the product."""
        return f"Product({self.name}, ${self.price})"
`
            },
            {
                name: '__init__.py',
                webkitRelativePath: 'demo_project/utils/__init__.py',
                content: `"""Utilities package with helper functions."""

from .logger import Logger
from .validators import validate_email, validate_username

__all__ = ['Logger', 'validate_email', 'validate_username']
`
            },
            {
                name: 'logger.py',
                webkitRelativePath: 'demo_project/utils/logger.py',
                content: `"""
Logging utility module.
Provides structured logging capabilities.
"""

import logging
from datetime import datetime
from typing import Optional, Any

class Logger:
    """Custom logger with additional functionality."""
    
    def __init__(self, name: str, level: int = logging.INFO):
        """Initialize logger with given name."""
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)
        
        # Configure handler if not already configured
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
    
    def info(self, message: str, **kwargs) -> None:
        """Log info message."""
        self.logger.info(message, extra=kwargs)
    
    def warning(self, message: str, **kwargs) -> None:
        """Log warning message."""
        self.logger.warning(message, extra=kwargs)
    
    def error(self, message: str, exception: Optional[Exception] = None, **kwargs) -> None:
        """Log error message with optional exception."""
        if exception:
            self.logger.error(f"{message}: {str(exception)}", exc_info=True, extra=kwargs)
        else:
            self.logger.error(message, extra=kwargs)
    
    def debug(self, message: str, **kwargs) -> None:
        """Log debug message."""
        self.logger.debug(message, extra=kwargs)
    
    def critical(self, message: str, **kwargs) -> None:
        """Log critical message."""
        self.logger.critical(message, extra=kwargs)
    
    @staticmethod
    def format_exception(exception: Exception) -> str:
        """Format exception for logging."""
        return f"{type(exception).__name__}: {str(exception)}"
`
            },
            {
                name: 'validators.py',
                webkitRelativePath: 'demo_project/utils/validators.py',
                content: `"""
Validation utilities.
Provides common validation functions.
"""

import re
from typing import Tuple

# Regular expression patterns
EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')
USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_]{3,20}$')

def validate_email(email: str) -> Tuple[bool, str]:
    """
    Validate email address format.
    
    Args:
        email: Email address to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not email:
        return False, "Email cannot be empty"
    
    if not EMAIL_PATTERN.match(email):
        return False, "Invalid email format"
    
    return True, ""

def validate_username(username: str) -> Tuple[bool, str]:
    """
    Validate username format.
    
    Args:
        username: Username to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not username:
        return False, "Username cannot be empty"
    
    if len(username) < 3:
        return False, "Username must be at least 3 characters long"
    
    if len(username) > 20:
        return False, "Username must be at most 20 characters long"
    
    if not USERNAME_PATTERN.match(username):
        return False, "Username can only contain letters, numbers, and underscores"
    
    return True, ""

def validate_password(password: str) -> Tuple[bool, str]:
    """
    Validate password strength.
    
    Args:
        password: Password to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not password:
        return False, "Password cannot be empty"
    
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    
    return True, ""
`
            },
            {
                name: 'test_user_service.py',
                webkitRelativePath: 'demo_project/tests/test_user_service.py',
                content: `"""
Tests for user service.
"""

import unittest
from unittest.mock import Mock, patch
from services.user_service import UserService
from models.user import User

class TestUserService(unittest.TestCase):
    """Test cases for UserService."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_db = Mock()
        self.user_service = UserService(self.mock_db)
    
    def test_create_user(self):
        """Test user creation."""
        # Arrange
        username = "testuser"
        email = "test@example.com"
        self.mock_db.execute.return_value = []
        
        # Act
        user = self.user_service.create_user(username, email)
        
        # Assert
        assert user.username == username
        assert user.email == email
        self.mock_db.execute.assert_called()
    
    def test_get_user_from_cache(self):
        """Test getting user from cache."""
        # Arrange
        user = User(id=1, username="cached", email="cached@example.com")
        self.user_service._cache[1] = user
        
        # Act
        result = self.user_service.get_user(1)
        
        # Assert
        assert result == user
        self.mock_db.execute.assert_not_called()
    
    def test_get_user_from_database(self):
        """Test getting user from database."""
        # Arrange
        user_data = {
            'id': 2,
            'username': 'dbuser',
            'email': 'db@example.com'
        }
        self.mock_db.execute.return_value = [user_data]
        
        # Act
        result = self.user_service.get_user(2)
        
        # Assert
        assert result.username == 'dbuser'
        assert result.email == 'db@example.com'
        assert 2 in self.user_service._cache
    
    def test_delete_user(self):
        """Test user deletion."""
        # Arrange
        user = User(id=3, username="delete", email="delete@example.com")
        self.user_service._cache[3] = user
        self.mock_db.execute.return_value = []
        
        # Act
        result = self.user_service.delete_user(3)
        
        # Assert
        assert result is True
        assert 3 not in self.user_service._cache
        self.mock_db.execute.assert_called()

if __name__ == '__main__':
    unittest.main()
`
            },
            {
                name: 'test_validators.py',
                webkitRelativePath: 'demo_project/tests/test_validators.py',
                content: `"""
Tests for validation utilities.
"""

import pytest
from utils.validators import validate_email, validate_username, validate_password

class TestValidators:
    """Test cases for validators."""
    
    def test_validate_email_valid(self):
        """Test valid email addresses."""
        valid_emails = [
            "user@example.com",
            "user.name@example.com",
            "user+tag@example.co.uk"
        ]
        
        for email in valid_emails:
            is_valid, error = validate_email(email)
            assert is_valid is True
            assert error == ""
    
    def test_validate_email_invalid(self):
        """Test invalid email addresses."""
        invalid_emails = [
            "",
            "invalid",
            "no-at-sign.com",
            "@example.com",
            "user@",
            "user@.com"
        ]
        
        for email in invalid_emails:
            is_valid, error = validate_email(email)
            assert is_valid is False
            assert error != ""
    
    def test_validate_username_valid(self):
        """Test valid usernames."""
        valid_usernames = [
            "user123",
            "test_user",
            "abc",
            "user_name_123"
        ]
        
        for username in valid_usernames:
            is_valid, error = validate_username(username)
            assert is_valid is True
            assert error == ""
    
    def test_validate_username_invalid(self):
        """Test invalid usernames."""
        invalid_usernames = [
            "",
            "ab",  # too short
            "a" * 21,  # too long
            "user-name",  # invalid character
            "user name",  # space
            "user@name"  # special character
        ]
        
        for username in invalid_usernames:
            is_valid, error = validate_username(username)
            assert is_valid is False
            assert error != ""
    
    def test_validate_password_valid(self):
        """Test valid passwords."""
        valid_passwords = [
            "Password123",
            "SecureP@ss1",
            "MyStr0ngP@ssword"
        ]
        
        for password in valid_passwords:
            is_valid, error = validate_password(password)
            assert is_valid is True
            assert error == ""
    
    def test_validate_password_invalid(self):
        """Test invalid passwords."""
        invalid_passwords = [
            "",
            "short1A",  # too short
            "alllowercase1",  # no uppercase
            "ALLUPPERCASE1",  # no lowercase
            "NoNumbers",  # no digits
            "12345678"  # no letters
        ]
        
        for password in invalid_passwords:
            is_valid, error = validate_password(password)
            assert is_valid is False
            assert error != ""

if __name__ == '__main__':
    pytest.main([__file__])
`
            }
        ];
        
        // Create File objects from the content
        const loadedFiles = [];
        
        for (const fileInfo of demoFiles) {
            console.log(`Creating file object for ${fileInfo.webkitRelativePath}...`);
            
            const file = new File([fileInfo.content], fileInfo.name, { type: 'text/x-python' });
            
            Object.defineProperty(file, 'webkitRelativePath', {
                value: fileInfo.webkitRelativePath,
                writable: false
            });
            
            loadedFiles.push(file);
        }
        
        console.log(`Successfully created ${loadedFiles.length} demo file objects`);
        
        // Clear any existing selection
        clearFileSelection();
        
        // Add files to collection
        addFilesToCollection(loadedFiles);
        
        // Show success message
        showNotification('Demo project loaded! Click "Analyze Codebase" to see the visualization.');
        
        // Auto-analyze after a short delay
        setTimeout(() => {
            const analyzeBtn = document.getElementById('analyze-btn');
            if (analyzeBtn && !analyzeBtn.disabled) {
                analyzeBtn.click();
            }
        }, 500);
        
    } catch (error) {
        console.error('Error loading demo project:', error);
        showNotification('Error loading demo project. See console for details.', true);
    }
}

/**
 * Load a previous analysis
 */
function loadAnalysis(index) {
    const analysis = analysisHistory[index];
    if (analysis && analysis.graphData) {
        graphVisualizer.update(analysis.graphData);
        updateMetricsDashboard(analysis.metrics);
        showNotification(`Loaded analysis from ${analysis.timestamp.toLocaleString()}`);
    }
}

/**
 * Export metrics report
 */
function exportMetricsReport() {
    if (!currentAnalysis || !currentAnalysis.metrics) {
        showNotification('No analysis data to export', true);
        return;
    }
    
    const report = generateMetricsReport(currentAnalysis.metrics);
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `codebase-metrics-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('Metrics report exported successfully!');
}

/**
 * Generate metrics report in Markdown format
 */
function generateMetricsReport(metrics) {
    const overall = metrics.overall;
    const date = new Date().toLocaleString();
    
    let report = `# Codebase Analysis Report
Generated on: ${date}

## Summary
- **Total Files**: ${overall.total_files}
- **Total Lines**: ${overall.total_lines.toLocaleString()}
- **Lines of Code**: ${overall.total_code_lines.toLocaleString()}
- **Comment Lines**: ${overall.total_comment_lines.toLocaleString()}

## Code Structure
- **Functions**: ${overall.total_functions}
- **Classes**: ${overall.total_classes}
- **Average Complexity**: ${overall.avg_complexity.toFixed(2)}
- **Maximum Complexity**: ${overall.max_complexity}

## Code Quality
- **Average Quality Score**: ${overall.avg_quality_score.toFixed(0)}%
- **Test Coverage (Estimated)**: ${overall.test_coverage_estimate}%
- **TODO Comments**: ${overall.total_todos}
- **Files with Errors**: ${overall.files_with_errors}

## Detailed Metrics by File
`;
    
    // Add file-level metrics
    Object.entries(metrics).forEach(([filepath, fileMetrics]) => {
        if (filepath !== 'overall' && fileMetrics.lines_of_code) {
            report += `
### ${filepath}
- Lines of Code: ${fileMetrics.lines_of_code}
- Complexity: ${fileMetrics.cyclomatic_complexity || 'N/A'}
- Quality Score: ${fileMetrics.quality_score || 'N/A'}%
- Functions: ${fileMetrics.function_count || 0}
- Classes: ${fileMetrics.class_count || 0}
`;
        }
    });
    
    return report;
}

/**
 * Show detailed metrics view
 */
function showDetailedMetrics() {
    if (!currentAnalysis || !currentAnalysis.metrics) {
        showNotification('No analysis data available', true);
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal metrics-modal';
    modal.innerHTML = `
        <div class="modal-content large">
            <div class="modal-header">
                <h3>Detailed Code Metrics</h3>
                <span class="close-modal" onclick="this.closest('.modal').remove()">×</span>
            </div>
            <div class="modal-body">
                ${generateDetailedMetricsHTML(currentAnalysis.metrics)}
            </div>
            <div class="modal-footer">
                <button onclick="exportMetricsReport()">Export Report</button>
                <button onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

/**
 * Generate detailed metrics HTML
 */
function generateDetailedMetricsHTML(metrics) {
    let html = '<div class="detailed-metrics">';
    
    // Sort files by complexity
    const fileMetrics = Object.entries(metrics)
        .filter(([key]) => key !== 'overall')
        .filter(([_, m]) => m.lines_of_code)
        .sort((a, b) => (b[1].cyclomatic_complexity || 0) - (a[1].cyclomatic_complexity || 0));
    
    // Most complex files
    html += `
        <div class="metric-section">
            <h4>Most Complex Files</h4>
            <table class="metrics-table">
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Complexity</th>
                        <th>Quality</th>
                        <th>Lines</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    fileMetrics.slice(0, 10).forEach(([filepath, fm]) => {
        const filename = filepath.split('/').pop();
        const complexityClass = fm.cyclomatic_complexity > 10 ? 'danger' : 
                               fm.cyclomatic_complexity > 5 ? 'warning' : 'good';
        const qualityClass = fm.quality_score > 70 ? 'good' : 
                            fm.quality_score > 50 ? 'warning' : 'danger';
        
        html += `
            <tr>
                <td title="${filepath}">${filename}</td>
                <td class="${complexityClass}">${fm.cyclomatic_complexity || 'N/A'}</td>
                <td class="${qualityClass}">${fm.quality_score || 'N/A'}%</td>
                <td>${fm.lines_of_code}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    // Files needing attention
    const filesNeedingAttention = fileMetrics.filter(([_, fm]) => 
        fm.quality_score < 50 || fm.cyclomatic_complexity > 10 || fm.unused_imports?.length > 0
    );
    
    if (filesNeedingAttention.length > 0) {
        html += `
            <div class="metric-section">
                <h4>Files Needing Attention</h4>
                <div class="attention-list">
        `;
        
        filesNeedingAttention.forEach(([filepath, fm]) => {
            const issues = [];
            if (fm.quality_score < 50) issues.push('Low quality score');
            if (fm.cyclomatic_complexity > 10) issues.push('High complexity');
            if (fm.unused_imports?.length > 0) issues.push(`${fm.unused_imports.length} unused imports`);
            
            html += `
                <div class="attention-item">
                    <div class="filename">${filepath.split('/').pop()}</div>
                    <div class="issues">${issues.join(' • ')}</div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

/**
 * Display a notification message
 */
function showNotification(message, isError = false) {
    let notification = document.querySelector('.notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = isError ? 'notification error' : 'notification';
    
    notification.style.display = 'block';
    notification.style.opacity = '1';
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 500);
    }, isError ? 5000 : 3000);
}

// Add enhanced notification styles
addEnhancedStyles();

/**
 * Add enhanced CSS styles
 */
function addEnhancedStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Progress Indicator */
        .analysis-progress {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        }
        
        .progress-content {
            background: var(--card-bg);
            padding: 30px;
            border-radius: var(--radius-md);
            text-align: center;
            min-width: 300px;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background: var(--darker-bg);
            border-radius: 10px;
            margin: 20px 0;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--magenta-primary), var(--magenta-secondary));
            border-radius: 10px;
            transition: width 0.3s ease;
        }
        
        .progress-info {
            color: var(--text-secondary);
        }
        
        /* Metrics Dashboard */
        .metrics-dashboard {
            margin-top: 20px;
            padding: 20px;
            background: var(--darker-bg);
            border-radius: var(--radius-md);
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .metric-card {
            background: var(--card-bg);
            padding: 15px;
            border-radius: var(--radius-sm);
            text-align: center;
            border: 1px solid var(--border-color);
        }
        
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: var(--magenta-primary);
        }
        
        .metric-label {
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 5px;
        }
        
        .health-indicators {
            margin-top: 20px;
        }
        
        .health-item {
            margin-bottom: 15px;
        }
        
        .health-label {
            display: inline-block;
            width: 150px;
            color: var(--text-secondary);
        }
        
        .health-value {
            font-weight: bold;
            margin-left: 10px;
        }
        
        .health-value.good { color: var(--function-color); }
        .health-value.warning { color: var(--import-color); }
        .health-value.danger { color: var(--class-color); }
        
        .health-bar {
            width: 100%;
            height: 8px;
            background: var(--darker-bg);
            border-radius: 4px;
            margin-top: 5px;
            overflow: hidden;
        }
        
        .health-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.5s ease;
        }
        
        .health-fill.good { background: var(--function-color); }
        .health-fill.warning { background: var(--import-color); }
        .health-fill.danger { background: var(--class-color); }
        
        /* Analysis History */
        .analysis-history {
            margin-top: 20px;
            padding: 15px;
            background: var(--darker-bg);
            border-radius: var(--radius-sm);
        }
        
        .history-list {
            margin-top: 10px;
        }
        
        .history-item {
            padding: 10px;
            margin-bottom: 5px;
            background: var(--card-bg);
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: all var(--transition-fast);
        }
        
        .history-item:hover {
            transform: translateX(5px);
            box-shadow: var(--shadow-sm);
        }
        
        .history-time {
            font-size: 12px;
            color: var(--text-secondary);
        }
        
        .history-info {
            font-size: 14px;
            color: var(--text-color);
        }
        
        /* Search Container */
        .graph-search-container {
            position: relative;
            margin-bottom: 15px;
        }
        
        #graph-search {
            width: 100%;
            padding: 10px 40px 10px 15px;
            background: var(--darker-bg);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            color: var(--text-color);
            font-size: 14px;
        }
        
        #graph-search:focus {
            outline: none;
            border-color: var(--magenta-primary);
            box-shadow: 0 0 0 2px rgba(232, 62, 140, 0.3);
        }
        
        #clear-search {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-size: 20px;
            cursor: pointer;
            padding: 5px;
        }
        
        #search-results {
            margin-top: 5px;
            font-size: 12px;
            color: var(--text-secondary);
            display: none;
        }
        
        /* Graph Filters */
        .graph-filters {
            margin-top: 20px;
            padding: 15px;
            background: var(--darker-bg);
            border-radius: var(--radius-sm);
        }
        
        #node-filters {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-top: 10px;
        }
        
        #node-filters label {
            display: flex;
            align-items: center;
            cursor: pointer;
            color: var(--text-color);
            font-size: 14px;
        }
        
        #node-filters input[type="checkbox"] {
            margin-right: 8px;
            cursor: pointer;
        }
        
        /* Layout Controls */
        .graph-layout-controls,
        .graph-color-controls {
            margin-left: 10px;
        }
        
        .graph-layout-controls select,
        .graph-color-controls select {
            padding: 5px 10px;
            background: var(--darker-bg);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            color: var(--text-color);
            cursor: pointer;
        }
        
        /* Insights Modal */
        .insights-modal .modal-content {
            max-width: 500px;
        }
        
        .insight-item {
            padding: 15px;
            margin-bottom: 10px;
            border-radius: var(--radius-sm);
            border-left: 4px solid;
        }
        
        .insight-item.info {
            background: rgba(52, 152, 219, 0.1);
            border-color: var(--file-color);
        }
        
        .insight-item.warning {
            background: rgba(243, 156, 18, 0.1);
            border-color: var(--import-color);
        }
        
        .insight-item.danger {
            background: rgba(231, 76, 60, 0.1);
            border-color: var(--class-color);
        }
        
        .insight-item h4 {
            margin: 0 0 5px 0;
            color: var(--text-color);
        }
        
        .insight-item p {
            margin: 0;
            color: var(--text-secondary);
            font-size: 14px;
        }
        
        /* Help Button */
        .help-button {
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--magenta-primary);
            color: white;
            border: none;
            font-size: 20px;
            cursor: pointer;
            box-shadow: var(--shadow-md);
            transition: all var(--transition-fast);
            z-index: 100;
        }
        
        .help-button:hover {
            transform: scale(1.1);
            box-shadow: var(--shadow-lg);
        }
        
        /* Keyboard Shortcuts */
        .shortcuts-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 20px;
        }
        
        .shortcut {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .shortcut kbd {
            background: var(--darker-bg);
            padding: 5px 10px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--border-color);
            font-family: monospace;
            font-size: 12px;
        }
        
        /* Drag and Drop */
        .drag-highlight {
            border: 2px dashed var(--magenta-primary) !important;
            background: rgba(232, 62, 140, 0.1) !important;
        }
        
        /* Enhanced File List */
        .file-info {
            font-size: 11px;
            color: var(--text-secondary);
            margin-left: 10px;
        }
        
        .dir-info {
            font-size: 12px;
            color: var(--text-secondary);
        }
        
        .toggle-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 12px;
            padding: 0 5px;
            margin-right: 5px;
        }
        
        .file-count.warning {
            color: var(--import-color);
        }
        
        /* Common indicator in subdirectory modal */
        .common-indicator {
            background: var(--import-color);
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: var(--radius-sm);
            margin-left: 5px;
        }
        
        /* Metrics Table */
        .metrics-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        
        .metrics-table th,
        .metrics-table td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }
        
        .metrics-table th {
            background: var(--darker-bg);
            font-weight: bold;
            color: var(--text-color);
        }
        
        .metrics-table td.good { color: var(--function-color); }
        .metrics-table td.warning { color: var(--import-color); }
        .metrics-table td.danger { color: var(--class-color); }
        
        /* Attention List */
        .attention-list {
            margin-top: 10px;
        }
        
        .attention-item {
            padding: 10px;
            margin-bottom: 5px;
            background: var(--card-bg);
            border-radius: var(--radius-sm);
            border-left: 3px solid var(--import-color);
        }
        
        .attention-item .filename {
            font-weight: bold;
            color: var(--text-color);
        }
        
        .attention-item .issues {
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 3px;
        }
        
        /* Pulse animation for buttons */
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .pulse {
            animation: pulse 0.5s ease-in-out;
        }
        
        /* Large modal */
        .modal-content.large {
            max-width: 900px;
            width: 90%;
            max-height: 80vh;
        }
        
        .modal-content.large .modal-body {
            max-height: 60vh;
            overflow-y: auto;
        }
        
        /* Empty message */
        .empty-message {
            text-align: center;
            color: var(--text-secondary);
            font-style: italic;
            padding: 20px;
        }
        
        /* Enhanced notification */
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background-color: var(--magenta-primary);
            color: white;
            border-radius: var(--radius-sm);
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4), 0 0 20px rgba(232, 62, 140, 0.3);
            transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            font-weight: 500;
            transform: translateY(-10px);
            opacity: 0;
            animation: notificationEnter 0.5s forwards;
            max-width: 400px;
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
        
        /* Minimap */
        .minimap-container {
            position: absolute;
            bottom: 10px;
            right: 10px;
            width: 150px;
            height: 150px;
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid #333;
            border-radius: 5px;
            overflow: hidden;
            opacity: 0.7;
            transition: opacity 0.3s;
        }
        
        .minimap-container:hover {
            opacity: 1;
        }
        
        .minimap-viewport {
            fill: none;
            stroke: #e83e8c;
            stroke-width: 2;
            opacity: 0.5;
        }
    `;
    document.head.appendChild(style);
}