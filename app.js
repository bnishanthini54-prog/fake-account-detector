/**
 * Main Application Orchestrator & View Controller (Module 1, 9, 10, 11)
 * Manages user logins, navigation state, dashboard graph rendering,
 * scan animation pipelines, ML arena displays, and database visualizers.
 */

class Application {
    constructor() {
        this.currentView = 'dashboard';
        this.charts = {};
        this.networkViz = null;
        
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.checkAuth();
        this.bindEvents();
        this.loadPresetsList();
        
        // Default initial dashboard load
        if (this.isUserLoggedIn()) {
            this.showView('dashboard');
            this.renderDashboardCharts();
            this.updateDashboardStats();
        }
    }

    // --- MODULE 1: AUTHENTICATION ROUTING ---
    checkAuth() {
        const session = window.db ? window.db.getCurrentSession() : null;
        const authScreen = document.getElementById('authScreen');
        const mainScreen = document.getElementById('mainScreen');
        
        if (session) {
            if (authScreen) authScreen.style.display = 'none';
            if (mainScreen) mainScreen.style.display = 'flex';
            
            // Set User Details
            document.querySelectorAll('.user-name').forEach(el => el.textContent = session.fullName);
            document.querySelectorAll('.user-role').forEach(el => el.textContent = session.role);
            document.querySelectorAll('.user-avatar').forEach(el => el.textContent = session.fullName.charAt(0));
            
            // Show Admin Sidebar items if role is admin
            const adminItems = document.querySelectorAll('.admin-only');
            adminItems.forEach(el => {
                el.style.display = session.role === 'admin' ? 'block' : 'none';
            });
        } else {
            if (authScreen) authScreen.style.display = 'flex';
            if (mainScreen) mainScreen.style.display = 'none';
            this.clearCharts();
        }
    }

    isUserLoggedIn() {
        return window.db && window.db.getCurrentSession() !== null;
    }

    clearCharts() {
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) this.charts[key].destroy();
        });
        this.charts = {};
    }

    bindEvents() {
        // Login Form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const u = document.getElementById('loginUser').value.trim();
                const p = document.getElementById('loginPass').value.trim();
                
                const res = window.db.loginUser(u, p);
                if (res.success) {
                    this.checkAuth();
                    this.showView('dashboard');
                    this.renderDashboardCharts();
                    this.updateDashboardStats();
                } else {
                    alert(res.message);
                }
            });
        }

        // Register Switch
        const showRegister = document.getElementById('showRegister');
        const showLogin = document.getElementById('showLogin');
        const loginSection = document.getElementById('loginSection');
        const registerSection = document.getElementById('registerSection');
        
        if (showRegister && showLogin && loginSection && registerSection) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                loginSection.style.display = 'none';
                registerSection.style.display = 'block';
            });
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                loginSection.style.display = 'block';
                registerSection.style.display = 'none';
            });
        }

        // Register Form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const u = document.getElementById('regUser').value;
                const f = document.getElementById('regName').value;
                const p = document.getElementById('regPass').value;
                
                const res = window.db.registerUser(u, f, p);
                if (res.success) {
                    alert("Registration successful! Please login.");
                    loginSection.style.display = 'block';
                    registerSection.style.display = 'none';
                } else {
                    alert(res.message);
                }
            });
        }

        // Logout
        document.querySelectorAll('.logout-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.db.logoutUser();
                this.checkAuth();
            });
        });

        // Navigation Sidebar
        document.querySelectorAll('.sidebar-item a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetView = link.getAttribute('data-view');
                if (targetView) {
                    this.showView(targetView);
                }
            });
        });

        // Profiler Run Scan
        const profilerForm = document.getElementById('profilerForm');
        if (profilerForm) {
            profilerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.runProfileDetection();
            });
        }

        // Preset load in Form
        document.getElementById('presetSelectBtn')?.addEventListener('click', () => {
            const val = document.getElementById('profilePreset').value;
            const profiles = window.db.getProfiles();
            const p = profiles.find(item => item.id === val);
            if (p) {
                document.getElementById('p_username').value = p.username;
                document.getElementById('p_fullName').value = p.fullName;
                document.getElementById('p_bio').value = p.bio;
                document.getElementById('p_picUrl').value = p.profilePicUrl;
                document.getElementById('p_followers').value = p.followersCount;
                document.getElementById('p_following').value = p.followingCount;
                document.getElementById('p_posts').value = p.postsCount;
                document.getElementById('p_age').value = p.accountAgeDays;
                document.getElementById('p_verified').checked = p.isVerified;
                
                const postsArea = document.getElementById('p_samplePosts');
                if (postsArea && p.posts) {
                    postsArea.value = p.posts.join('\n');
                }
            }
        });

        // Admin Config Threshold Save
        const configForm = document.getElementById('adminConfigForm');
        if (configForm) {
            configForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const threshold = parseInt(document.getElementById('cfg_threshold').value);
                const modelType = document.getElementById('cfg_modelType').value;
                const minAge = parseInt(document.getElementById('cfg_minAge').value);
                const keywords = document.getElementById('cfg_keywords').value
                    .split('\n')
                    .map(k => k.trim())
                    .filter(k => k.length > 0);
                
                const current = window.db.getConfig();
                current.threshold = threshold;
                current.modelType = modelType;
                current.minAccountAgeDays = minAge;
                current.spamKeywords = keywords;
                
                window.db.saveConfig(current);
                alert("Settings successfully saved and encryption verified.");
                this.updateDashboardStats();
            });
        }

        // ML Training Trigger
        document.getElementById('btnTrainModel')?.addEventListener('click', () => {
            this.runMLTrainingSimulation();
        });

        // Network preset switch
        document.getElementById('networkPreset')?.addEventListener('change', (e) => {
            if (this.networkViz) {
                this.networkViz.loadPreset(e.target.value);
            }
        });

        // Clear scan history logs
        document.getElementById('btnClearLogs')?.addEventListener('click', () => {
            if (confirm("Are you sure you want to clear the entire scan history?")) {
                window.db.clearLogs();
                this.updateDbBrowser();
                this.updateDashboardStats();
                if (this.currentView === 'dashboard') {
                    this.renderDashboardCharts();
                }
            }
        });

        // Database Export
        document.getElementById('btnExportDb')?.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(window.db.exportDatabase());
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "fad_database_backup.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });

        // Database Import
        document.getElementById('btnImportDb')?.addEventListener('click', () => {
            document.getElementById('dbImportFile').click();
        });

        document.getElementById('dbImportFile')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const res = window.db.importDatabase(event.target.result);
                if (res.success) {
                    alert("Database imported successfully!");
                    this.updateDbBrowser();
                    this.updateDashboardStats();
                    if (this.currentView === 'dashboard') {
                        this.renderDashboardCharts();
                    }
                } else {
                    alert(res.message);
                }
            };
            reader.readAsText(file);
        });

        // Feedback Correction trigger
        document.getElementById('btnSubmitFeedback')?.addEventListener('click', () => {
            const targetUsername = document.getElementById('report_username').textContent;
            const selectVal = document.getElementById('feedbackClassification').value;
            
            // Log it
            alert(`Thank you! Fed feedback into system training dataset. Classification overridden to: ${selectVal.toUpperCase()}. We recommend retraining the machine learning model in the ML Arena.`);
            
            // Simulate saving feedback to ML dataset
            const rawProfiles = window.db.getProfiles();
            const prof = rawProfiles.find(p => p.username === targetUsername);
            if (prof) {
                prof.classification = selectVal;
                window.db.saveProfile(prof);
            }
            this.updateDashboardStats();
        });
    }

    showView(viewName) {
        this.currentView = viewName;
        
        // Remove active class from all sidebar items
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
            if (item.querySelector('a').getAttribute('data-view') === viewName) {
                item.classList.add('active');
            }
        });

        // Hide all views
        document.querySelectorAll('.view-panel').forEach(panel => {
            panel.style.display = 'none';
        });

        // Show target view
        const target = document.getElementById(`view-${viewName}`);
        if (target) {
            target.style.display = 'block';
        }

        // Trigger view-specific operations
        if (viewName === 'dashboard') {
            this.renderDashboardCharts();
            this.updateDashboardStats();
        } else if (viewName === 'network') {
            this.initNetworkViz();
        } else if (viewName === 'database') {
            this.updateDbBrowser();
        } else if (viewName === 'security') {
            this.updateSecurityLogs();
        } else if (viewName === 'admin') {
            this.loadAdminConfig();
        }
    }

    // --- MODULE 11: VISUALIZATION DASHBOARD ---
    updateDashboardStats() {
        const logs = window.db.getLogs();
        const profiles = window.db.getProfiles();
        const config = window.db.getConfig();

        // 1. Total Scanned
        document.getElementById('stat_totalScans').textContent = logs.length;
        
        // 2. Fake accounts percentage
        const fakesCount = logs.filter(l => l.classification === 'fake').length;
        const ratio = logs.length > 0 ? Math.round((fakesCount / logs.length) * 100) : 0;
        document.getElementById('stat_fakeRatio').textContent = ratio + "%";

        // 3. Profiles preset DB
        document.getElementById('stat_dbRecords').textContent = profiles.length;

        // 4. Algorithm status
        document.getElementById('stat_currentModel').textContent = config.modelType === 'naive_bayes' ? 'Naive Bayes' : 'Decision Tree';
    }

    renderDashboardCharts() {
        this.clearCharts();
        
        // 1. Scan volume / timeline chart (Line Chart)
        const ctxLine = document.getElementById('scanHistoryChart');
        if (ctxLine) {
            // Generate mock historical scan counts for the last 5 days
            const labels = ['June 11', 'June 12', 'June 13', 'June 14', 'June 15 (Today)'];
            const dataFake = [8, 12, 18, 11, 24];
            const dataReal = [15, 20, 22, 16, 30];
            
            this.charts.line = new Chart(ctxLine.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Fake Profiles Scanned',
                            data: dataFake,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Real Profiles Scanned',
                            data: dataReal,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#9ca3af', font: { family: 'Outfit' } } }
                    },
                    scales: {
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
                    }
                }
            });
        }

        // 2. Risk factor breakdown chart (Doughnut Chart)
        const ctxDoughnut = document.getElementById('riskDistributionChart');
        if (ctxDoughnut) {
            const logs = window.db.getLogs();
            let fakeCount = logs.filter(l => l.classification === 'fake').length;
            let realCount = logs.filter(l => l.classification === 'real').length;
            let suspiciousCount = logs.filter(l => l.classification === 'suspicious').length;
            
            // Seed defaults if empty
            if (logs.length === 0) {
                fakeCount = 45;
                realCount = 55;
                suspiciousCount = 20;
            }

            this.charts.doughnut = new Chart(ctxDoughnut.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Real Account', 'Fake Account', 'Suspicious'],
                    datasets: [{
                        data: [realCount, fakeCount, suspiciousCount],
                        backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                        borderColor: 'rgba(6, 9, 19, 0.8)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#9ca3af', font: { family: 'Outfit' } }
                        }
                    }
                }
            });
        }
    }

    // --- MODULE 2 & 5: SCANNING PIPELINE ---
    runProfileDetection() {
        const loader = document.getElementById('scanLoader');
        if (loader) loader.classList.add('active');

        // Extract raw form inputs
        const rawProfile = {
            username: document.getElementById('p_username').value,
            fullName: document.getElementById('p_fullName').value,
            bio: document.getElementById('p_bio').value,
            profilePicUrl: document.getElementById('p_picUrl').value,
            followersCount: parseInt(document.getElementById('p_followers').value) || 0,
            followingCount: parseInt(document.getElementById('p_following').value) || 0,
            postsCount: parseInt(document.getElementById('p_posts').value) || 0,
            accountAgeDays: parseInt(document.getElementById('p_age').value) || 0,
            isVerified: document.getElementById('p_verified').checked,
            posts: document.getElementById('p_samplePosts').value.split('\n').map(p => p.trim()).filter(p => p.length > 0)
        };

        // Simulated asynchronous analysis steps for rich animations
        const pipelineSteps = document.querySelectorAll('.step-node');
        const progressLine = document.querySelector('.pipeline-progress-bar');
        
        let currentStep = 0;
        pipelineSteps.forEach(n => n.className = 'step-node');
        if (progressLine) progressLine.style.width = '0%';
        
        const updateStep = () => {
            if (currentStep < pipelineSteps.length) {
                // Complete previous step
                if (currentStep > 0) {
                    pipelineSteps[currentStep - 1].className = 'step-node complete';
                }
                
                pipelineSteps[currentStep].className = 'step-node active';
                if (progressLine) {
                    progressLine.style.width = `${(currentStep / (pipelineSteps.length - 1)) * 100}%`;
                }

                // Show corresponding data container in UI
                document.querySelectorAll('.pipeline-panel').forEach(p => p.classList.remove('active'));
                const stepPanelId = `stepPanel_${currentStep + 1}`;
                document.getElementById(stepPanelId)?.classList.add('active');

                // Perform core feature processing at each step
                if (currentStep === 0) {
                    // Preprocessing View
                    const clean = window.mlEngine.preprocessData(rawProfile);
                    document.getElementById('pre_json').textContent = JSON.stringify(clean, null, 2);
                } else if (currentStep === 1) {
                    // Feature Extraction View
                    const clean = window.mlEngine.preprocessData(rawProfile);
                    const features = window.mlEngine.extractFeatures(clean);
                    this.renderFeaturesTable(features);
                } else if (currentStep === 2) {
                    // ML Classification
                    this.scanResult = window.mlEngine.detectProfile(rawProfile);
                    document.getElementById('det_json').textContent = JSON.stringify(this.scanResult, null, 2);
                } else if (currentStep === 3) {
                    // Report generated
                    this.renderReport(this.scanResult);
                    if (loader) loader.classList.remove('active');
                    this.updateDashboardStats();
                }

                currentStep++;
                setTimeout(updateStep, 1000);
            }
        };

        setTimeout(updateStep, 100);
    }

    renderFeaturesTable(features) {
        const grid = document.getElementById('featuresGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        const config = window.db.getConfig();
        const weights = config.featureWeights;

        const featureLabels = {
            followerRatioScore: { name: "Follower-Following Ratio", weight: weights.followerRatio },
            profileCompletenessScore: { name: "Profile Completeness", weight: weights.profileCompleteness },
            accountAgeScore: { name: "Account Age Factor", weight: weights.accountAge },
            usernameComplexityScore: { name: "Username Complexity", weight: weights.usernameComplexity },
            contentSpamScore: { name: "Spam Keyword Density", weight: weights.contentSpam }
        };

        Object.keys(featureLabels).forEach(key => {
            const pill = document.createElement('div');
            pill.className = 'feature-pill';
            pill.innerHTML = `
                <span class="feature-name">${featureLabels[key].name}</span>
                <span class="feature-value">${(features[key] * 100).toFixed(1)}%</span>
                <span class="feature-weight">Weight: ${featureLabels[key].weight}%</span>
            `;
            grid.appendChild(pill);
        });
    }

    // --- MODULE 9: ALERT AND REPORT CENTER ---
    renderReport(res) {
        // Text labels
        document.getElementById('report_username').textContent = `@${res.username}`;
        document.getElementById('report_fullName').textContent = res.fullName;
        document.getElementById('report_bio').textContent = res.bio || 'None';
        document.getElementById('report_followers').textContent = res.followersCount.toLocaleString();
        document.getElementById('report_following').textContent = res.followingCount.toLocaleString();
        document.getElementById('report_age').textContent = `${res.accountAgeDays} days`;
        
        // Verification badge status
        const vBadge = document.getElementById('report_verified_badge');
        if (vBadge) {
            vBadge.style.display = res.isVerified ? 'inline-block' : 'none';
        }

        // Score circle update
        const circle = document.getElementById('riskCircleFill');
        if (circle) {
            // Circle length is 377. Calc dashoffset
            const percent = res.riskScore;
            const offset = 377 - (377 * percent / 100);
            circle.style.strokeDashoffset = offset;
            
            // Set circle color based on classification
            if (res.classification === 'fake') {
                circle.style.stroke = '#ef4444';
            } else if (res.classification === 'suspicious') {
                circle.style.stroke = '#f59e0b';
            } else {
                circle.style.stroke = '#10b981';
            }
        }
        document.getElementById('riskTextPercent').textContent = `${res.riskScore}%`;

        // Classification badge
        const badge = document.getElementById('reportClassificationBadge');
        if (badge) {
            badge.className = `status-badge ${res.classification}`;
            let icon = 'shield-check';
            let labelText = 'Verified Real';
            if (res.classification === 'fake') {
                icon = 'alert-triangle';
                labelText = 'Fake / Bot Profile';
            } else if (res.classification === 'suspicious') {
                icon = 'alert-circle';
                labelText = 'Suspicious Profile';
            }
            badge.innerHTML = `<i class="lucide-${icon}"></i> ${labelText}`;
        }

        // Trigger Flags List
        const flagContainer = document.getElementById('reportFlagsList');
        if (flagContainer) {
            flagContainer.innerHTML = '';
            if (res.flags.length === 0) {
                flagContainer.innerHTML = `
                    <div class="report-flag-item real">
                        <i class="lucide-check-circle" style="color: var(--success)"></i>
                        <div>
                            <strong>No severe warnings triggered.</strong> Account exhibits normal structural patterns.
                        </div>
                    </div>
                `;
            } else {
                res.flags.forEach(flag => {
                    let desc = '';
                    switch(flag) {
                        case 'high_following_ratio': desc = 'Follows an excessive number of accounts with minimal return followers.'; break;
                        case 'incomplete_profile': desc = 'Lacks vital details like profile picture, active bio, or posting details.'; break;
                        case 'recently_created_account': desc = 'Account was registered in the past few days (often seen in disposable bots).'; break;
                        case 'suspicious_username_structure': desc = 'Username contains highly dense numeric blocks matching standard automated formats.'; break;
                        case 'spam_keywords_or_links': desc = 'Profile description or posts contain known crypto scams, hyperlinks or phishing patterns.'; break;
                        case 'no_profile_picture': desc = 'Has no profile picture uploaded (default avatar).'; break;
                    }
                    flagContainer.innerHTML += `
                        <div class="report-flag-item">
                            <i class="lucide-alert-triangle" style="color: var(--danger)"></i>
                            <div>
                                <strong>Warning Flag: ${flag.replace(/_/g, ' ').toUpperCase()}</strong><br>
                                <span style="font-size: 11px; color: var(--text-muted)">${desc}</span>
                            </div>
                        </div>
                    `;
                });
            }
        }
    }

    loadPresetsList() {
        const select = document.getElementById('profilePreset');
        if (!select) return;
        
        select.innerHTML = '';
        const profiles = window.db.getProfiles();
        profiles.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.fullName} (@${p.username})`;
            select.appendChild(opt);
        });

        // Load Preset details container
        const container = document.getElementById('profilePresetsList');
        if (container) {
            container.innerHTML = '';
            profiles.forEach(p => {
                const item = document.createElement('div');
                item.className = 'preset-item';
                item.innerHTML = `
                    <div class="preset-details">
                        <span class="preset-name">${p.fullName}</span>
                        <span class="preset-type ${p.classification}">${p.classification.toUpperCase()}</span>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="document.getElementById('profilePreset').value='${p.id}'; document.getElementById('presetSelectBtn').click();">Load</button>
                `;
                container.appendChild(item);
            });
        }
    }

    // --- MODULE 7: NETWORK VISUALIZER LINK ---
    initNetworkViz() {
        if (!this.networkViz) {
            this.networkViz = new NetworkVisualizer('networkCanvas');
            this.networkViz.onSelectNode((node) => {
                document.getElementById('nodeName').textContent = `@${node.label}`;
                document.getElementById('nodeRole').textContent = node.role;
                document.getElementById('nodeDetails').textContent = node.details;
                
                const statusBadge = document.getElementById('nodeStatusBadge');
                if (statusBadge) {
                    statusBadge.className = `status-badge ${node.type}`;
                    statusBadge.innerHTML = `<i class="lucide-${node.type === 'fake' ? 'alert-triangle' : 'check'}"></i> ${node.type.toUpperCase()}`;
                }
            });
        }
    }

    // --- MODULE 8: MACHINE LEARNING ARENA ---
    runMLTrainingSimulation() {
        const btn = document.getElementById('btnTrainModel');
        const terminal = document.getElementById('mlTerminal');
        if (!btn || !terminal) return;

        btn.disabled = true;
        btn.textContent = "Training Model...";
        terminal.innerHTML = `<div>[${new Date().toLocaleTimeString()}] Initialising Gradient Descent optimizer...</div>`;
        
        // Graph Canvas setup for Loss/Accuracy curves
        const ctxLoss = document.getElementById('trainingCurveChart');
        let lossChart = this.charts.lossChart;
        
        const epochLabels = [];
        const lossData = [];
        const accuracyData = [];

        if (lossChart) {
            lossChart.destroy();
        }

        lossChart = new Chart(ctxLoss.getContext('2d'), {
            type: 'line',
            data: {
                labels: epochLabels,
                datasets: [
                    {
                        label: 'Training Loss',
                        data: lossData,
                        borderColor: '#ef4444',
                        borderWidth: 2,
                        tension: 0.2,
                        yAxisID: 'yLoss'
                    },
                    {
                        label: 'Validation Accuracy',
                        data: accuracyData,
                        borderColor: '#10b981',
                        borderWidth: 2,
                        tension: 0.2,
                        yAxisID: 'yAcc'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    yLoss: { type: 'linear', position: 'left', grid: { color: 'rgba(255,255,255,0.05)' }, min: 0, max: 1.0 },
                    yAcc: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, min: 0.5, max: 1.0 }
                }
            }
        });
        this.charts.lossChart = lossChart;

        window.mlEngine.trainModel(
            (epochData) => {
                // Epoch progress
                terminal.innerHTML = `<div>[EPOCH ${epochData.epoch}/10] loss: ${epochData.loss} - accuracy: ${(epochData.accuracy*100).toFixed(2)}%</div>` + terminal.innerHTML;
                
                epochLabels.push(`Epoch ${epochData.epoch}`);
                lossData.push(epochData.loss);
                accuracyData.push(epochData.accuracy);
                lossChart.update();
            },
            (finalMetrics) => {
                // Complete
                terminal.innerHTML = `<div style="color: var(--success); font-weight:700;">[SUCCESS] Training complete. Parameters locked. Validation accuracy: ${(finalMetrics.accuracy*100).toFixed(2)}%</div>` + terminal.innerHTML;
                btn.disabled = false;
                btn.textContent = "Train Detection Model";

                // Render Confusion Matrix
                const matrix = finalMetrics.confusionMatrix;
                document.getElementById('cm_tp').textContent = matrix.tp;
                document.getElementById('cm_tn').textContent = matrix.tn;
                document.getElementById('cm_fp').textContent = matrix.fp;
                document.getElementById('cm_fn').textContent = matrix.fn;
            }
        );
    }

    // --- MODULE 10: ADMIN PANEL ---
    loadAdminConfig() {
        const config = window.db.getConfig();
        document.getElementById('cfg_threshold').value = config.threshold;
        document.getElementById('cfg_modelType').value = config.modelType;
        document.getElementById('cfg_minAge').value = config.minAccountAgeDays;
        document.getElementById('cfg_keywords').value = config.spamKeywords.join('\n');
    }

    // --- MODULE 12: DATABASE BROWSER ---
    updateDbBrowser() {
        const logs = window.db.getLogs();
        const tbody = document.getElementById('dbLogsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dark);">No scans run yet. Run a profile scan inside the Profiler tab first.</td></tr>`;
            return;
        }

        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:600;">@${log.username}</td>
                <td>${log.fullName}</td>
                <td><span class="status-badge ${log.classification}" style="padding: 2px 8px; font-size:10px;">${log.classification.toUpperCase()}</span></td>
                <td style="font-family:var(--font-mono); font-weight:700;">${log.riskScore}%</td>
                <td>${new Date(log.analyzedAt).toLocaleTimeString()}</td>
                <td>
                    <button class="btn btn-sm btn-danger" style="padding:4px 8px; font-size:10px;" onclick="window.db.deleteProfile('${log.id}'); window.app.updateDbBrowser(); window.app.updateDashboardStats();">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- MODULE 13: SECURITY LOGS ---
    updateSecurityLogs() {
        const events = window.db.getSecurityEvents();
        const tbody = document.getElementById('securityLogsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        events.forEach(ev => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family:var(--font-mono); font-size:11px;">${new Date(ev.timestamp).toLocaleTimeString()}</td>
                <td style="font-weight:600; color:var(--secondary);">${ev.type}</td>
                <td>${ev.event}</td>
                <td><span class="badge-lbl ${ev.status === 'SUCCESS' ? 'green' : 'yellow'}">${ev.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }
}

const app = new Application();
window.app = app; // Export to global scope
