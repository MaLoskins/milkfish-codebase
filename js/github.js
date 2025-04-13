/**
 * GitHub Repository Integration
 * Handles GitHub API requests, repository fetching, and file processing
 */
class GitHubIntegration {
    constructor() {
        // Constants
        this.API_BASE_URL = 'https://api.github.com';
        this.RAW_CONTENT_BASE_URL = 'https://raw.githubusercontent.com';
        
        // State
        this.repoOwner = '';
        this.repoName = '';
        this.repoBranch = 'main'; // Default branch
        this.repoFiles = [];
        this.pythonFiles = [];
        this.totalFileSize = 0;
        this.subdirectories = [];
        this.selectedSubdirectories = [];
    }

    /**
     * Parse a GitHub repository URL to extract owner, repo name, and branch
     * @param {string} url - GitHub repository URL
     * @returns {Object} - Parsed repository information
     */
    parseRepoUrl(url) {
        try {
            // Remove trailing slash if present
            url = url.replace(/\/$/, '');
            
            // Handle different GitHub URL formats
            let parsedUrl;
            
            if (url.includes('github.com')) {
                // Standard GitHub URL: https://github.com/owner/repo
                // or with branch: https://github.com/owner/repo/tree/branch
                parsedUrl = new URL(url);
                
                const pathParts = parsedUrl.pathname.split('/').filter(part => part.length > 0);
                
                if (pathParts.length < 2) {
                    throw new Error('Invalid GitHub repository URL. Expected format: https://github.com/owner/repo');
                }
                
                this.repoOwner = pathParts[0];
                this.repoName = pathParts[1];
                
                // Check if a branch is specified
                if (pathParts.length > 3 && pathParts[2] === 'tree') {
                    this.repoBranch = pathParts[3];
                }
            } else {
                // Handle shorthand format: owner/repo
                const parts = url.split('/');
                if (parts.length !== 2) {
                    throw new Error('Invalid repository format. Expected format: owner/repo');
                }
                
                this.repoOwner = parts[0];
                this.repoName = parts[1];
            }
            
            return {
                owner: this.repoOwner,
                repo: this.repoName,
                branch: this.repoBranch
            };
        } catch (error) {
            console.error('Error parsing GitHub URL:', error);
            throw new Error('Invalid GitHub repository URL. Please provide a valid URL.');
        }
    }

    /**
     * Fetch repository metadata from GitHub API
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @returns {Promise<Object>} - Repository metadata
     */
    async fetchRepoMetadata(owner, repo) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/repos/${owner}/${repo}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Repository not found. Please check the URL and ensure the repository is public.');
                } else if (response.status === 403) {
                    throw new Error('API rate limit exceeded. Please try again later.');
                } else {
                    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
                }
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching repository metadata:', error);
            throw error;
        }
    }

    /**
     * Fetch repository contents (files and directories)
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {string} path - Path within the repository (empty for root)
     * @param {string} branch - Repository branch
     * @returns {Promise<Array>} - Repository contents
     */
    async fetchRepoContents(owner, repo, path = '', branch = 'main') {
        try {
            const url = `${this.API_BASE_URL}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Repository contents not found. Please check the URL and ensure the repository is public.');
                } else if (response.status === 403) {
                    throw new Error('API rate limit exceeded. Please try again later.');
                } else {
                    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
                }
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching repository contents:', error);
            throw error;
        }
    }

    /**
     * Recursively fetch all files in a repository or specific path
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {string} branch - Repository branch
     * @param {string} path - Path within the repository
     * @param {number} maxFiles - Maximum number of files to fetch
     * @returns {Promise<Array>} - Array of file objects
     */
    async fetchAllFiles(owner, repo, branch, path = '', maxFiles = 300) {
        try {
            const contents = await this.fetchRepoContents(owner, repo, path, branch);
            let files = [];
            
            // Process each item (file or directory)
            for (const item of contents) {
                // Check if we've reached the file limit
                if (files.length >= maxFiles) {
                    console.warn(`Reached maximum file limit (${maxFiles}). Some files will be skipped.`);
                    break;
                }
                
                if (item.type === 'file') {
                    // Add file to the collection
                    files.push({
                        name: item.name,
                        path: item.path,
                        size: item.size,
                        type: item.type,
                        download_url: item.download_url
                    });
                } else if (item.type === 'dir') {
                    // Track subdirectory
                    this.subdirectories.push(item.path);
                    
                    // Recursively fetch files in subdirectory
                    const subdirFiles = await this.fetchAllFiles(
                        owner, 
                        repo, 
                        branch, 
                        item.path, 
                        maxFiles - files.length
                    );
                    
                    files = files.concat(subdirFiles);
                }
            }
            
            return files;
        } catch (error) {
            console.error('Error fetching all files:', error);
            throw error;
        }
    }

    /**
     * Fetch files from selected subdirectories
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {string} branch - Repository branch
     * @param {Array} selectedDirs - Array of selected directory paths
     * @param {number} maxFiles - Maximum number of files to fetch
     * @returns {Promise<Array>} - Array of file objects
     */
    async fetchFilesFromSelectedDirs(owner, repo, branch, selectedDirs, maxFiles = 300) {
        try {
            let files = [];
            
            // Fetch files from each selected directory
            for (const dir of selectedDirs) {
                // Check if we've reached the file limit
                if (files.length >= maxFiles) {
                    console.warn(`Reached maximum file limit (${maxFiles}). Some directories will be skipped.`);
                    break;
                }
                
                const dirFiles = await this.fetchAllFiles(
                    owner, 
                    repo, 
                    branch, 
                    dir, 
                    maxFiles - files.length
                );
                
                files = files.concat(dirFiles);
            }
            
            return files;
        } catch (error) {
            console.error('Error fetching files from selected directories:', error);
            throw error;
        }
    }

    /**
     * Download file content from GitHub
     * @param {string} url - Raw content URL
     * @returns {Promise<string>} - File content
     */
    async downloadFile(url) {
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
            }
            
            return await response.text();
        } catch (error) {
            console.error('Error downloading file:', error);
            throw error;
        }
    }

    /**
     * Filter for Python files and calculate total size
     * @param {Array} files - Array of file objects
     * @param {number} maxSize - Maximum total size in bytes
     * @returns {Object} - Filtered Python files and size information
     */
    filterPythonFiles(files, maxSize) {
        const pythonFiles = files.filter(file => file.name.endsWith('.py'));
        const totalSize = pythonFiles.reduce((sum, file) => sum + file.size, 0);
        
        return {
            pythonFiles,
            totalSize,
            exceedsLimit: totalSize > maxSize
        };
    }

    /**
     * Extract subdirectories from files
     * @param {Array} files - Array of file objects
     * @returns {Array} - Array of unique top-level directories
     */
    extractSubdirectories(files) {
        const dirSet = new Set();
        
        files.forEach(file => {
            const pathParts = file.path.split('/');
            
            if (pathParts.length > 1) {
                // Get top-level directory
                dirSet.add(pathParts[0]);
            }
        });
        
        return Array.from(dirSet).sort();
    }

    /**
     * Convert GitHub files to File objects for the parser
     * @param {Array} files - Array of GitHub file objects
     * @returns {Promise<Array>} - Array of File objects
     */
    async convertToFileObjects(files) {
        const fileObjects = [];
        
        for (const file of files) {
            try {
                // Download file content
                const content = await this.downloadFile(file.download_url);
                
                // Create a File object
                const fileObj = new File([content], file.name, { type: 'text/x-python' });
                
                // Add the path as webkitRelativePath property
                Object.defineProperty(fileObj, 'webkitRelativePath', {
                    value: file.path,
                    writable: false
                });
                
                fileObjects.push(fileObj);
            } catch (error) {
                console.error(`Error processing file ${file.path}:`, error);
                // Continue with other files
            }
        }
        
        return fileObjects;
    }

    /**
     * Process a GitHub repository URL and prepare files for analysis
     * @param {string} url - GitHub repository URL
     * @param {number} maxFiles - Maximum number of files to process
     * @param {number} maxSize - Maximum total size in bytes
     * @returns {Promise<Object>} - Repository information and files
     */
    async processRepository(url, maxFiles = 300, maxSize = 5 * 1024 * 1024) {
        try {
            // Parse repository URL
            const repoInfo = this.parseRepoUrl(url);
            
            // Fetch repository metadata
            const metadata = await this.fetchRepoMetadata(repoInfo.owner, repoInfo.repo);
            
            // Update default branch if provided in metadata
            this.repoBranch = metadata.default_branch || repoInfo.branch;
            
            // Fetch all files in the repository
            const allFiles = await this.fetchAllFiles(
                repoInfo.owner, 
                repoInfo.repo, 
                this.repoBranch, 
                '', 
                maxFiles
            );
            
            // Filter for Python files and check size limits
            const { pythonFiles, totalSize, exceedsLimit } = this.filterPythonFiles(allFiles, maxSize);
            
            // Extract subdirectories
            this.subdirectories = this.extractSubdirectories(allFiles);
            this.selectedSubdirectories = [...this.subdirectories]; // Initially select all
            
            // Store state
            this.repoFiles = allFiles;
            this.pythonFiles = pythonFiles;
            this.totalFileSize = totalSize;
            
            return {
                metadata,
                files: pythonFiles,
                totalSize,
                exceedsLimit,
                subdirectories: this.subdirectories,
                fileCount: pythonFiles.length,
                exceedsFileCountLimit: pythonFiles.length > maxFiles
            };
        } catch (error) {
            console.error('Error processing repository:', error);
            throw error;
        }
    }

    /**
     * Process selected subdirectories and prepare files for analysis
     * @param {Array} selectedDirs - Array of selected directory paths
     * @param {number} maxFiles - Maximum number of files to process
     * @param {number} maxSize - Maximum total size in bytes
     * @returns {Promise<Object>} - Files information
     */
    async processSelectedDirectories(selectedDirs, maxFiles = 300, maxSize = 5 * 1024 * 1024) {
        try {
            // Update selected subdirectories
            this.selectedSubdirectories = selectedDirs;
            
            // Fetch files from selected directories
            const files = await this.fetchFilesFromSelectedDirs(
                this.repoOwner,
                this.repoName,
                this.repoBranch,
                selectedDirs,
                maxFiles
            );
            
            // Filter for Python files and check size limits
            const { pythonFiles, totalSize, exceedsLimit } = this.filterPythonFiles(files, maxSize);
            
            // Store state
            this.pythonFiles = pythonFiles;
            this.totalFileSize = totalSize;
            
            return {
                files: pythonFiles,
                totalSize,
                exceedsLimit,
                fileCount: pythonFiles.length,
                exceedsFileCountLimit: pythonFiles.length > maxFiles
            };
        } catch (error) {
            console.error('Error processing selected directories:', error);
            throw error;
        }
    }

    /**
     * Prepare files for analysis by converting to File objects
     * @returns {Promise<Array>} - Array of File objects ready for the parser
     */
    async prepareFilesForAnalysis() {
        try {
            return await this.convertToFileObjects(this.pythonFiles);
        } catch (error) {
            console.error('Error preparing files for analysis:', error);
            throw error;
        }
    }
}

// Create a global instance
const githubIntegration = new GitHubIntegration();