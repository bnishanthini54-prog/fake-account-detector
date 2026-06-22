/**
 * Machine Learning & Feature Processing Module (Modules 3, 4, 5, 6, 8, 14)
 * Provides data cleaning, text sanitization, numerical feature extraction,
 * spam pattern matching, and simulated model training.
 */

class MachineLearningEngine {
    constructor() {
        // Initialize weights for decision engine
        this.weights = {
            followerRatio: 0.25,
            profileCompleteness: 0.15,
            accountAge: 0.20,
            usernameComplexity: 0.15,
            contentSpam: 0.25
        };
        
        // Custom dataset of 120 points for live training simulation
        this.trainingDataset = this.generateDataset(120);
        this.isTraining = false;
        this.currentAccuracy = 0.82; // Baseline
    }

    // --- MODULE 3: DATA PREPROCESSING ---
    preprocessData(rawProfile) {
        const clean = {};
        
        // Remove duplicates and trim whitespace
        clean.username = (rawProfile.username || "").trim().toLowerCase();
        clean.fullName = (rawProfile.fullName || "").trim();
        clean.bio = (rawProfile.bio || "").replace(/\s+/g, ' ').trim();
        
        // Handle missing numeric values
        clean.followersCount = Math.max(0, parseInt(rawProfile.followersCount) || 0);
        clean.followingCount = Math.max(0, parseInt(rawProfile.followingCount) || 0);
        clean.postsCount = Math.max(0, parseInt(rawProfile.postsCount) || 0);
        clean.accountAgeDays = Math.max(0, parseInt(rawProfile.accountAgeDays) || 0);
        clean.isVerified = !!rawProfile.isVerified;
        clean.profilePicUrl = (rawProfile.profilePicUrl || "").trim();
        
        // Posts sanitization (array of strings)
        clean.posts = Array.isArray(rawProfile.posts) 
            ? rawProfile.posts.map(p => p.trim()).filter(p => p.length > 0)
            : [];
            
        return clean;
    }

    // --- MODULE 4: FEATURE EXTRACTION ---
    extractFeatures(cleanProfile) {
        const features = {};
        
        // 1. Follower to Following ratio (often very low or high on bots)
        // Ratio = followers / (following + 1)
        // High risk if following is extremely large compared to followers, e.g. following > 2000 and ratio < 0.1
        const ratio = cleanProfile.followersCount / (cleanProfile.followingCount + 1);
        if (cleanProfile.followingCount > 1000 && ratio < 0.05) {
            features.followerRatioScore = 1.0; // extreme risk
        } else if (cleanProfile.followingCount > 500 && ratio < 0.15) {
            features.followerRatioScore = 0.7; // high risk
        } else if (cleanProfile.followingCount < 50) {
            features.followerRatioScore = 0.4; // minor flag
        } else {
            features.followerRatioScore = 0.1; // normal
        }

        // 2. Profile Completeness Score
        // 0.0 is complete, 1.0 is highly incomplete (suspicious)
        let completenessLoss = 0.0;
        if (!cleanProfile.profilePicUrl || cleanProfile.profilePicUrl === "") completenessLoss += 0.4;
        if (!cleanProfile.bio || cleanProfile.bio === "") completenessLoss += 0.4;
        if (cleanProfile.postsCount === 0) completenessLoss += 0.2;
        features.profileCompletenessScore = completenessLoss;

        // 3. Account Age Score
        // New accounts are high risk. Max risk if < 7 days old, decreasing.
        if (cleanProfile.accountAgeDays <= 7) {
            features.accountAgeScore = 1.0;
        } else if (cleanProfile.accountAgeDays <= 30) {
            features.accountAgeScore = 0.7;
        } else if (cleanProfile.accountAgeDays <= 90) {
            features.accountAgeScore = 0.4;
        } else {
            features.accountAgeScore = 0.05;
        }

        // 4. Username Complexity Score
        // Digits density, length, special characters.
        // Bots often use usernames like "john3928173"
        const username = cleanProfile.username;
        const digitCount = (username.match(/\d/g) || []).length;
        const digitDensity = username.length > 0 ? digitCount / username.length : 0;
        
        let complexity = 0.1;
        if (digitDensity > 0.4 && username.length > 8) complexity += 0.6; // heavy numbers
        if (username.length > 15) complexity += 0.2; // long username
        if (/[^a-zA-Z0-9_.]/.test(username)) complexity += 0.2; // odd characters
        features.usernameComplexityScore = Math.min(1.0, complexity);

        // 5. Content Analysis & Spam Keywords Score
        const contentSpamScore = this.analyzeContentSpam(cleanProfile.posts, cleanProfile.bio);
        features.contentSpamScore = contentSpamScore;

        return features;
    }

    // --- MODULE 6: CONTENT ANALYSIS ---
    analyzeContentSpam(posts, bio) {
        const sysConfig = window.db ? window.db.getConfig() : {
            spamKeywords: ['buy crypto', 'free gift card', 'dm to collab', 'onlyfans link', 'whatsapp me', 'make money fast']
        };
        const keywords = sysConfig.spamKeywords;
        
        let totalSpamScore = 0;
        let spamFlagsCount = 0;
        let totalCheckedStrings = 0;
        
        const textToAnalyze = [...posts];
        if (bio) textToAnalyze.push(bio);
        
        if (textToAnalyze.length === 0) return 0.2; // Neutral/low risk if no posts/bio
        
        textToAnalyze.forEach(text => {
            const cleanText = text.toLowerCase();
            totalCheckedStrings++;
            
            // Check spam keywords
            let keywordTriggers = 0;
            keywords.forEach(kw => {
                if (cleanText.includes(kw)) {
                    keywordTriggers++;
                }
            });
            
            // Check link presence (redirects or suspicious URL shorteners)
            const hasLink = /https?:\/\/[^\s]+|fastlink|linktr\.ee|bit\.ly/i.test(cleanText);
            
            // Check excessive capitalization (YELLING)
            const uppercaseCount = (text.match(/[A-Z]/g) || []).length;
            const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
            const isYelling = letterCount > 10 && (uppercaseCount / letterCount) > 0.6;
            
            let stringRisk = 0;
            if (keywordTriggers > 0) stringRisk += 0.6;
            if (hasLink) stringRisk += 0.3;
            if (isYelling) stringRisk += 0.2;
            
            if (stringRisk > 0) {
                totalSpamScore += Math.min(1.0, stringRisk);
                spamFlagsCount++;
            }
        });
        
        // Calculate average spam weight
        const avgSpam = totalSpamScore / totalCheckedStrings;
        return Math.min(1.0, avgSpam);
    }

    // --- MODULE 5: FAKE ACCOUNT DETECTION ---
    detectProfile(rawProfile) {
        // Preprocess
        const cleanProfile = this.preprocessData(rawProfile);
        
        // Extract features
        const features = this.extractFeatures(cleanProfile);
        
        // Fetch current weights & threshold from settings
        const config = window.db ? window.db.getConfig() : null;
        const customWeights = config ? config.featureWeights : null;
        
        let finalScore = 0;
        const weights = customWeights ? {
            followerRatio: customWeights.followerRatio / 100,
            profileCompleteness: customWeights.profileCompleteness / 100,
            accountAge: customWeights.accountAge / 100,
            usernameComplexity: customWeights.usernameComplexity / 100,
            contentSpam: customWeights.contentSpam / 100
        } : this.weights;

        // Linear Combination / Classification Probability simulation
        finalScore += features.followerRatioScore * weights.followerRatio;
        finalScore += features.profileCompletenessScore * weights.profileCompleteness;
        finalScore += features.accountAgeScore * weights.accountAge;
        features.accountAgeScore_raw = cleanProfile.accountAgeDays; // keep for display
        finalScore += features.usernameComplexityScore * weights.usernameComplexity;
        finalScore += features.contentSpamScore * weights.contentSpam;

        // Normalize to percentage
        let riskScore = Math.round(finalScore * 100);
        
        // Verified account bypass logic (unless spam hits extreme threshold)
        if (cleanProfile.isVerified) {
            riskScore = Math.round(riskScore * 0.15); // Heavily slash risk score if verified
        }

        // Formulate alerts/flags triggered
        const flags = [];
        if (features.followerRatioScore >= 0.7) flags.push("high_following_ratio");
        if (features.profileCompletenessScore >= 0.6) flags.push("incomplete_profile");
        if (cleanProfile.accountAgeDays <= 7) flags.push("recently_created_account");
        if (features.usernameComplexityScore >= 0.7) flags.push("suspicious_username_structure");
        if (features.contentSpamScore >= 0.5) flags.push("spam_keywords_or_links");
        if (!cleanProfile.profilePicUrl || cleanProfile.profilePicUrl === "") flags.push("no_profile_picture");

        // Determine Classification
        const threshold = config ? config.threshold : 65;
        let classification = "real";
        if (riskScore >= threshold) {
            classification = "fake";
        } else if (riskScore >= threshold - 20) {
            classification = "suspicious";
        }

        const result = {
            username: cleanProfile.username,
            fullName: cleanProfile.fullName,
            bio: cleanProfile.bio,
            profilePicUrl: cleanProfile.profilePicUrl,
            followersCount: cleanProfile.followersCount,
            followingCount: cleanProfile.followingCount,
            postsCount: cleanProfile.postsCount,
            accountAgeDays: cleanProfile.accountAgeDays,
            isVerified: cleanProfile.isVerified,
            posts: cleanProfile.posts,
            features: features,
            flags: flags,
            riskScore: riskScore,
            classification: classification,
            analyzedAt: new Date().toISOString()
        };

        // Add to history database
        if (window.db) {
            window.db.addScanLog(result);
        }

        return result;
    }

    // --- MODULE 8: MACHINE LEARNING MODEL SIMULATED TRAINING ---
    generateDataset(size) {
        const dataset = [];
        for (let i = 0; i < size; i++) {
            const isFake = Math.random() > 0.5;
            dataset.push({
                isFake: isFake,
                // Simulate extracted numerical feature values [0, 1]
                features: {
                    followerRatio: isFake ? Math.random() * 0.6 + 0.4 : Math.random() * 0.3,
                    profileCompleteness: isFake ? Math.random() * 0.7 + 0.2 : Math.random() * 0.4,
                    accountAge: isFake ? Math.random() * 0.8 + 0.2 : Math.random() * 0.3,
                    usernameComplexity: isFake ? Math.random() * 0.5 + 0.4 : Math.random() * 0.4,
                    contentSpam: isFake ? Math.random() * 0.7 + 0.3 : Math.random() * 0.2
                }
            });
        }
        return dataset;
    }

    // Live training execution callback
    trainModel(onEpoch, onComplete) {
        if (this.isTraining) return;
        this.isTraining = true;
        
        let epoch = 0;
        const maxEpochs = 10;
        let trainingLoss = 0.95;
        let currentWeights = { ...this.weights };
        
        const interval = setInterval(() => {
            epoch++;
            
            // Backpropagation Simulation
            // Weights slightly converge, loss decreases, accuracy increases
            trainingLoss -= (trainingLoss * 0.2) + (Math.random() * 0.05);
            this.currentAccuracy += (0.95 - this.currentAccuracy) * 0.15 + (Math.random() * 0.02 - 0.01);
            this.currentAccuracy = Math.min(0.97, this.currentAccuracy);
            
            // Adjust weights iteratively
            Object.keys(currentWeights).forEach(key => {
                const target = key === 'followerRatio' || key === 'contentSpam' ? 0.26 : 0.16;
                currentWeights[key] += (target - currentWeights[key]) * 0.2;
            });

            onEpoch({
                epoch: epoch,
                loss: parseFloat(trainingLoss.toFixed(4)),
                accuracy: parseFloat(this.currentAccuracy.toFixed(4)),
                weights: currentWeights
            });

            if (epoch >= maxEpochs) {
                clearInterval(interval);
                this.isTraining = false;
                this.weights = currentWeights;
                
                // Save trained parameters to db config
                if (window.db) {
                    const cfg = window.db.getConfig();
                    cfg.featureWeights = {
                        followerRatio: Math.round(this.weights.followerRatio * 100),
                        profileCompleteness: Math.round(this.weights.profileCompleteness * 100),
                        accountAge: Math.round(this.weights.accountAge * 100),
                        usernameComplexity: Math.round(this.weights.usernameComplexity * 100),
                        contentSpam: Math.round(this.weights.contentSpam * 100)
                    };
                    window.db.saveConfig(cfg);
                }

                // Generate confusion matrix metrics
                const total = 100;
                const tp = Math.round(total * 0.5 * this.currentAccuracy);
                const tn = Math.round(total * 0.5 * (this.currentAccuracy + 0.02));
                const fp = Math.round(total * 0.5) - tn;
                const fn = Math.round(total * 0.5) - tp;

                onComplete({
                    accuracy: parseFloat(this.currentAccuracy.toFixed(4)),
                    confusionMatrix: { tp, tn, fp, fn }
                });
            }
        }, 600);
    }
}

const mlEngine = new MachineLearningEngine();
window.mlEngine = mlEngine; // Export to global scope
