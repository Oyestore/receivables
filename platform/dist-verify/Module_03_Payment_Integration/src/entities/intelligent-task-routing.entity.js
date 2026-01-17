"use strict";
/**
 * Intelligent Task Routing Entity
 * Advanced AI-powered task routing with DeepSeek R1 integration
 * Designed for SME Receivables Management Platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelligentTaskRoutingEntity = void 0;
const intelligent_workflow_enum_1 = require("@enums/intelligent-workflow.enum");
/**
 * Intelligent Task Routing Entity
 * Handles AI-powered task assignment and resource optimization
 */
class IntelligentTaskRoutingEntity {
    constructor(data) {
        // Initialize base properties
        this.id = data.id || this.generateId();
        this.tenantId = data.tenantId || '';
        this.name = data.name || 'Intelligent Task Router';
        this.description = data.description || 'AI-powered task routing and resource optimization';
        this.version = data.version || '1.0.0';
        this.intelligenceLevel = data.intelligenceLevel || intelligent_workflow_enum_1.WorkflowIntelligenceLevel.ADVANCED;
        this.automationLevel = data.automationLevel || intelligent_workflow_enum_1.WorkflowAutomationLevel.HIGHLY_AUTOMATED;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.createdBy = data.createdBy || 'system';
        this.updatedBy = data.updatedBy || 'system';
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.metadata = data.metadata || {};
        // Initialize AI configuration
        this.aiConfiguration = data.aiConfiguration || this.getDefaultAIConfiguration();
        this.primaryAIModel = data.primaryAIModel || intelligent_workflow_enum_1.AIModelType.DEEPSEEK_R1;
        this.processingMode = data.processingMode || intelligent_workflow_enum_1.AIProcessingMode.REAL_TIME_PROCESSING;
        this.modelConfidence = data.modelConfidence || 0.85;
        this.learningEnabled = data.learningEnabled !== undefined ? data.learningEnabled : true;
        this.adaptationEnabled = data.adaptationEnabled !== undefined ? data.adaptationEnabled : true;
        // Initialize routing configuration
        this.routingConfiguration = data.routingConfiguration || this.getDefaultRoutingConfiguration();
        this.currentStrategy = data.currentStrategy || intelligent_workflow_enum_1.IntelligentRoutingStrategy.HYBRID_OPTIMIZATION;
        this.fallbackStrategies = data.fallbackStrategies || [
            intelligent_workflow_enum_1.IntelligentRoutingStrategy.PERFORMANCE_BASED,
            intelligent_workflow_enum_1.IntelligentRoutingStrategy.SKILL_MATCHING,
            intelligent_workflow_enum_1.IntelligentRoutingStrategy.WORKLOAD_BALANCING
        ];
        this.confidenceThreshold = data.confidenceThreshold || intelligent_workflow_enum_1.RoutingConfidenceLevel.HIGH;
        // Initialize configuration objects
        this.performanceWeights = data.performanceWeights || this.getDefaultPerformanceWeights();
        this.skillMatchingConfig = data.skillMatchingConfig || this.getDefaultSkillMatchingConfig();
        this.resourceOptimizationConfig = data.resourceOptimizationConfig || this.getDefaultResourceOptimizationConfig();
        this.learningConfiguration = data.learningConfiguration || this.getDefaultLearningConfiguration();
        // Initialize performance tracking
        this.totalTasksRouted = data.totalTasksRouted || 0;
        this.successfulRoutings = data.successfulRoutings || 0;
        this.failedRoutings = data.failedRoutings || 0;
        this.averageConfidence = data.averageConfidence || 0;
        this.averageProcessingTime = data.averageProcessingTime || 0;
        this.qualityScore = data.qualityScore || 0;
        this.userSatisfactionScore = data.userSatisfactionScore || 0;
        // Initialize resource management
        this.availableResources = data.availableResources || [];
        this.resourceCapacities = data.resourceCapacities || {};
        this.resourceUtilization = data.resourceUtilization || {};
        this.resourcePerformance = data.resourcePerformance || {};
        this.resourceSkills = data.resourceSkills || {};
        // Initialize learning and adaptation
        this.learningHistory = data.learningHistory || [];
        this.adaptationHistory = data.adaptationHistory || [];
        this.performanceHistory = data.performanceHistory || [];
        this.feedbackHistory = data.feedbackHistory || [];
        // Initialize current state
        this.currentLoad = data.currentLoad || 0;
        this.queueSize = data.queueSize || 0;
        this.processingStatus = data.processingStatus || intelligent_workflow_enum_1.ProcessingStatus.QUEUED;
        this.lastOptimization = data.lastOptimization || new Date();
        this.nextOptimization = data.nextOptimization || new Date(Date.now() + 3600000); // 1 hour from now
    }
    /**
     * Route a task using intelligent AI-powered routing
     */
    async routeTask(taskData) {
        try {
            const startTime = Date.now();
            // Analyze task requirements
            const taskAnalysis = await this.analyzeTask(taskData);
            // Get available resources
            const availableResources = await this.getAvailableResources(taskData.requirements);
            // Apply intelligent routing strategy
            const routingDecision = await this.applyRoutingStrategy(taskData, taskAnalysis, availableResources);
            // Validate routing decision
            const validatedDecision = await this.validateRoutingDecision(routingDecision);
            // Update performance metrics
            const processingTime = Date.now() - startTime;
            await this.updatePerformanceMetrics(validatedDecision, processingTime);
            // Learn from routing decision
            if (this.learningEnabled) {
                await this.learnFromRouting(taskData, validatedDecision);
            }
            return validatedDecision;
        }
        catch (error) {
            console.error('Error in task routing:', error);
            throw new Error(`Task routing failed: ${error.message}`);
        }
    }
    /**
     * Analyze task requirements and complexity
     */
    async analyzeTask(taskData) {
        const analysis = {
            taskId: taskData.id,
            complexity: this.calculateTaskComplexity(taskData),
            requiredSkills: this.extractRequiredSkills(taskData),
            estimatedDuration: this.estimateTaskDuration(taskData),
            priority: taskData.priority || 'medium',
            deadline: taskData.deadline,
            resourceRequirements: taskData.requirements,
            qualityRequirements: taskData.qualityRequirements || [],
            riskFactors: this.identifyRiskFactors(taskData),
            dependencies: taskData.dependencies || [],
            constraints: taskData.constraints || []
        };
        return analysis;
    }
    /**
     * Calculate task complexity using AI analysis
     */
    calculateTaskComplexity(taskData) {
        let complexityScore = 0;
        // Analyze task description and requirements
        complexityScore += (taskData.description?.length || 0) / 100;
        complexityScore += (taskData.requirements?.length || 0) * 2;
        complexityScore += (taskData.dependencies?.length || 0) * 3;
        complexityScore += (taskData.constraints?.length || 0) * 2;
        // Analyze estimated effort
        if (taskData.estimatedHours) {
            complexityScore += taskData.estimatedHours / 8; // 8 hours = 1 complexity point
        }
        // Analyze required skills
        if (taskData.requiredSkills) {
            complexityScore += taskData.requiredSkills.length * 1.5;
        }
        // Determine complexity level
        if (complexityScore <= 2)
            return intelligent_workflow_enum_1.TaskComplexityLevel.TRIVIAL;
        if (complexityScore <= 5)
            return intelligent_workflow_enum_1.TaskComplexityLevel.SIMPLE;
        if (complexityScore <= 10)
            return intelligent_workflow_enum_1.TaskComplexityLevel.MODERATE;
        if (complexityScore <= 20)
            return intelligent_workflow_enum_1.TaskComplexityLevel.COMPLEX;
        if (complexityScore <= 50)
            return intelligent_workflow_enum_1.TaskComplexityLevel.VERY_COMPLEX;
        return intelligent_workflow_enum_1.TaskComplexityLevel.EXTREMELY_COMPLEX;
    }
    /**
     * Extract required skills from task data
     */
    extractRequiredSkills(taskData) {
        const skills = [];
        // Extract from explicit skill requirements
        if (taskData.requiredSkills) {
            skills.push(...taskData.requiredSkills);
        }
        // Extract from task type
        if (taskData.type) {
            const typeSkills = this.getSkillsForTaskType(taskData.type);
            skills.push(...typeSkills);
        }
        // Extract from task description using NLP (simplified)
        if (taskData.description) {
            const descriptionSkills = this.extractSkillsFromDescription(taskData.description);
            skills.push(...descriptionSkills);
        }
        return [...new Set(skills)]; // Remove duplicates
    }
    /**
     * Get skills required for specific task type
     */
    getSkillsForTaskType(taskType) {
        const skillMap = {
            'payment_processing': ['payment_gateways', 'financial_systems', 'compliance'],
            'data_analysis': ['analytics', 'statistics', 'data_visualization'],
            'customer_service': ['communication', 'problem_solving', 'empathy'],
            'technical_support': ['troubleshooting', 'technical_knowledge', 'documentation'],
            'quality_assurance': ['testing', 'attention_to_detail', 'process_improvement'],
            'project_management': ['planning', 'coordination', 'risk_management'],
            'software_development': ['programming', 'software_design', 'debugging'],
            'business_analysis': ['requirements_gathering', 'process_modeling', 'stakeholder_management']
        };
        return skillMap[taskType] || [];
    }
    /**
     * Extract skills from task description using simple NLP
     */
    extractSkillsFromDescription(description) {
        const skillKeywords = {
            'programming': ['code', 'develop', 'implement', 'debug', 'software'],
            'analysis': ['analyze', 'research', 'investigate', 'study', 'examine'],
            'communication': ['communicate', 'present', 'explain', 'discuss', 'coordinate'],
            'problem_solving': ['solve', 'fix', 'resolve', 'troubleshoot', 'address'],
            'project_management': ['manage', 'plan', 'organize', 'schedule', 'coordinate'],
            'testing': ['test', 'verify', 'validate', 'check', 'quality'],
            'documentation': ['document', 'write', 'record', 'report', 'manual']
        };
        const extractedSkills = [];
        const lowerDescription = description.toLowerCase();
        for (const [skill, keywords] of Object.entries(skillKeywords)) {
            if (keywords.some(keyword => lowerDescription.includes(keyword))) {
                extractedSkills.push(skill);
            }
        }
        return extractedSkills;
    }
    /**
     * Estimate task duration using AI prediction
     */
    estimateTaskDuration(taskData) {
        // If explicit duration is provided, use it
        if (taskData.estimatedHours) {
            return taskData.estimatedHours;
        }
        // Use AI model to estimate duration based on task characteristics
        let estimatedHours = 1; // Base estimate
        // Adjust based on complexity
        const complexity = this.calculateTaskComplexity(taskData);
        const complexityMultipliers = {
            [intelligent_workflow_enum_1.TaskComplexityLevel.TRIVIAL]: 0.5,
            [intelligent_workflow_enum_1.TaskComplexityLevel.SIMPLE]: 1,
            [intelligent_workflow_enum_1.TaskComplexityLevel.MODERATE]: 2,
            [intelligent_workflow_enum_1.TaskComplexityLevel.COMPLEX]: 4,
            [intelligent_workflow_enum_1.TaskComplexityLevel.VERY_COMPLEX]: 8,
            [intelligent_workflow_enum_1.TaskComplexityLevel.EXTREMELY_COMPLEX]: 16
        };
        estimatedHours *= complexityMultipliers[complexity];
        // Adjust based on required skills
        if (taskData.requiredSkills) {
            estimatedHours += taskData.requiredSkills.length * 0.5;
        }
        // Adjust based on dependencies
        if (taskData.dependencies) {
            estimatedHours += taskData.dependencies.length * 0.25;
        }
        return Math.max(0.25, estimatedHours); // Minimum 15 minutes
    }
    /**
     * Identify risk factors for the task
     */
    identifyRiskFactors(taskData) {
        const riskFactors = [];
        // Deadline risk
        if (taskData.deadline) {
            const timeToDeadline = new Date(taskData.deadline).getTime() - Date.now();
            const estimatedDuration = this.estimateTaskDuration(taskData) * 3600000; // Convert to milliseconds
            if (timeToDeadline < estimatedDuration * 1.5) {
                riskFactors.push('tight_deadline');
            }
        }
        // Complexity risk
        const complexity = this.calculateTaskComplexity(taskData);
        if (complexity === intelligent_workflow_enum_1.TaskComplexityLevel.VERY_COMPLEX || complexity === intelligent_workflow_enum_1.TaskComplexityLevel.EXTREMELY_COMPLEX) {
            riskFactors.push('high_complexity');
        }
        // Skill availability risk
        const requiredSkills = this.extractRequiredSkills(taskData);
        const availableSkills = this.getAvailableSkills();
        const missingSkills = requiredSkills.filter(skill => !availableSkills.includes(skill));
        if (missingSkills.length > 0) {
            riskFactors.push('skill_shortage');
        }
        // Dependency risk
        if (taskData.dependencies && taskData.dependencies.length > 3) {
            riskFactors.push('high_dependencies');
        }
        // Resource availability risk
        if (this.currentLoad > 0.8) {
            riskFactors.push('resource_constraint');
        }
        return riskFactors;
    }
    /**
     * Get available skills from all resources
     */
    getAvailableSkills() {
        const allSkills = [];
        for (const skills of Object.values(this.resourceSkills)) {
            allSkills.push(...skills);
        }
        return [...new Set(allSkills)];
    }
    /**
     * Get available resources for task requirements
     */
    async getAvailableResources(requirements) {
        const availableResources = [];
        for (const resourceId of this.availableResources) {
            const resource = await this.getResourceInfo(resourceId);
            if (this.isResourceAvailable(resource, requirements)) {
                availableResources.push(resource);
            }
        }
        return availableResources;
    }
    /**
     * Get detailed resource information
     */
    async getResourceInfo(resourceId) {
        return {
            id: resourceId,
            name: `Resource ${resourceId}`,
            type: 'human', // or 'system', 'service'
            capacity: this.resourceCapacities[resourceId] || 1,
            currentUtilization: this.resourceUtilization[resourceId] || 0,
            performance: this.resourcePerformance[resourceId] || 0.8,
            skills: this.resourceSkills[resourceId] || [],
            availability: this.calculateResourceAvailability(resourceId),
            cost: this.calculateResourceCost(resourceId),
            quality: this.calculateResourceQuality(resourceId),
            reliability: this.calculateResourceReliability(resourceId)
        };
    }
    /**
     * Check if resource is available for task requirements
     */
    isResourceAvailable(resource, requirements) {
        // Check capacity
        if (resource.currentUtilization >= resource.capacity) {
            return false;
        }
        // Check skill requirements
        if (requirements.requiredSkills) {
            const hasRequiredSkills = requirements.requiredSkills.every((skill) => resource.skills.includes(skill));
            if (!hasRequiredSkills) {
                return false;
            }
        }
        // Check availability
        if (resource.availability < 0.5) {
            return false;
        }
        return true;
    }
    /**
     * Calculate resource availability
     */
    calculateResourceAvailability(resourceId) {
        const utilization = this.resourceUtilization[resourceId] || 0;
        const capacity = this.resourceCapacities[resourceId] || 1;
        return Math.max(0, (capacity - utilization) / capacity);
    }
    /**
     * Calculate resource cost
     */
    calculateResourceCost(resourceId) {
        // Simplified cost calculation
        const baseCost = 100; // Base cost per hour
        const performance = this.resourcePerformance[resourceId] || 0.8;
        return baseCost * (1 + performance); // Higher performance = higher cost
    }
    /**
     * Calculate resource quality
     */
    calculateResourceQuality(resourceId) {
        const performance = this.resourcePerformance[resourceId] || 0.8;
        const reliability = this.calculateResourceReliability(resourceId);
        return (performance + reliability) / 2;
    }
    /**
     * Calculate resource reliability
     */
    calculateResourceReliability(resourceId) {
        // Simplified reliability calculation based on historical performance
        return this.resourcePerformance[resourceId] || 0.8;
    }
    /**
     * Apply intelligent routing strategy
     */
    async applyRoutingStrategy(taskData, taskAnalysis, availableResources) {
        let decision;
        switch (this.currentStrategy) {
            case intelligent_workflow_enum_1.IntelligentRoutingStrategy.PERFORMANCE_BASED:
                decision = await this.performanceBasedRouting(taskData, taskAnalysis, availableResources);
                break;
            case intelligent_workflow_enum_1.IntelligentRoutingStrategy.SKILL_MATCHING:
                decision = await this.skillBasedRouting(taskData, taskAnalysis, availableResources);
                break;
            case intelligent_workflow_enum_1.IntelligentRoutingStrategy.WORKLOAD_BALANCING:
                decision = await this.workloadBalancedRouting(taskData, taskAnalysis, availableResources);
                break;
            case intelligent_workflow_enum_1.IntelligentRoutingStrategy.COST_OPTIMIZATION:
                decision = await this.costOptimizedRouting(taskData, taskAnalysis, availableResources);
                break;
            case intelligent_workflow_enum_1.IntelligentRoutingStrategy.HYBRID_OPTIMIZATION:
                decision = await this.hybridOptimizedRouting(taskData, taskAnalysis, availableResources);
                break;
            default:
                decision = await this.hybridOptimizedRouting(taskData, taskAnalysis, availableResources);
        }
        return decision;
    }
    /**
     * Performance-based routing
     */
    async performanceBasedRouting(taskData, taskAnalysis, availableResources) {
        // Sort resources by performance
        const sortedResources = availableResources.sort((a, b) => b.performance - a.performance);
        const bestResource = sortedResources[0];
        if (!bestResource) {
            throw new Error('No available resources for task routing');
        }
        return this.createRoutingDecision(taskData, bestResource, intelligent_workflow_enum_1.IntelligentRoutingStrategy.PERFORMANCE_BASED, intelligent_workflow_enum_1.RoutingConfidenceLevel.HIGH, 0.85, ['Selected resource with highest performance score'], sortedResources.slice(1, 4).map(r => this.createAlternativeOption(r, intelligent_workflow_enum_1.IntelligentRoutingStrategy.PERFORMANCE_BASED)));
    }
    /**
     * Skill-based routing
     */
    async skillBasedRouting(taskData, taskAnalysis, availableResources) {
        const requiredSkills = taskAnalysis.requiredSkills;
        // Calculate skill match scores
        const resourceScores = availableResources.map(resource => ({
            resource,
            score: this.calculateSkillMatchScore(requiredSkills, resource.skills)
        }));
        // Sort by skill match score
        resourceScores.sort((a, b) => b.score - a.score);
        const bestMatch = resourceScores[0];
        if (!bestMatch || bestMatch.score < 0.5) {
            throw new Error('No suitable resources found for required skills');
        }
        return this.createRoutingDecision(taskData, bestMatch.resource, intelligent_workflow_enum_1.IntelligentRoutingStrategy.SKILL_MATCHING, intelligent_workflow_enum_1.RoutingConfidenceLevel.VERY_HIGH, bestMatch.score, [`Best skill match with score: ${bestMatch.score.toFixed(2)}`], resourceScores.slice(1, 4).map(rs => this.createAlternativeOption(rs.resource, intelligent_workflow_enum_1.IntelligentRoutingStrategy.SKILL_MATCHING)));
    }
    /**
     * Calculate skill match score
     */
    calculateSkillMatchScore(requiredSkills, resourceSkills) {
        if (requiredSkills.length === 0)
            return 1;
        const matchedSkills = requiredSkills.filter(skill => resourceSkills.includes(skill));
        return matchedSkills.length / requiredSkills.length;
    }
    /**
     * Workload-balanced routing
     */
    async workloadBalancedRouting(taskData, taskAnalysis, availableResources) {
        // Sort resources by availability (lowest utilization first)
        const sortedResources = availableResources.sort((a, b) => a.currentUtilization - b.currentUtilization);
        const leastUtilized = sortedResources[0];
        if (!leastUtilized) {
            throw new Error('No available resources for workload balancing');
        }
        return this.createRoutingDecision(taskData, leastUtilized, intelligent_workflow_enum_1.IntelligentRoutingStrategy.WORKLOAD_BALANCING, intelligent_workflow_enum_1.RoutingConfidenceLevel.HIGH, 0.8, [`Selected least utilized resource (${(leastUtilized.currentUtilization * 100).toFixed(1)}% utilization)`], sortedResources.slice(1, 4).map(r => this.createAlternativeOption(r, intelligent_workflow_enum_1.IntelligentRoutingStrategy.WORKLOAD_BALANCING)));
    }
    /**
     * Cost-optimized routing
     */
    async costOptimizedRouting(taskData, taskAnalysis, availableResources) {
        // Sort resources by cost (lowest first)
        const sortedResources = availableResources.sort((a, b) => a.cost - b.cost);
        const cheapestResource = sortedResources[0];
        if (!cheapestResource) {
            throw new Error('No available resources for cost optimization');
        }
        return this.createRoutingDecision(taskData, cheapestResource, intelligent_workflow_enum_1.IntelligentRoutingStrategy.COST_OPTIMIZATION, intelligent_workflow_enum_1.RoutingConfidenceLevel.MEDIUM, 0.75, [`Selected most cost-effective resource (${cheapestResource.cost}/hour)`], sortedResources.slice(1, 4).map(r => this.createAlternativeOption(r, intelligent_workflow_enum_1.IntelligentRoutingStrategy.COST_OPTIMIZATION)));
    }
    /**
     * Hybrid optimized routing (combines multiple factors)
     */
    async hybridOptimizedRouting(taskData, taskAnalysis, availableResources) {
        const requiredSkills = taskAnalysis.requiredSkills;
        // Calculate composite scores for each resource
        const resourceScores = availableResources.map(resource => {
            const skillScore = this.calculateSkillMatchScore(requiredSkills, resource.skills);
            const performanceScore = resource.performance;
            const availabilityScore = resource.availability;
            const costScore = 1 - (resource.cost / 200); // Normalize cost (assuming max cost is 200)
            const qualityScore = resource.quality;
            // Apply performance weights
            const compositeScore = skillScore * this.performanceWeights.accuracy +
                performanceScore * this.performanceWeights.speed +
                availabilityScore * this.performanceWeights.availability +
                costScore * this.performanceWeights.cost +
                qualityScore * this.performanceWeights.quality;
            return {
                resource,
                score: compositeScore,
                breakdown: {
                    skill: skillScore,
                    performance: performanceScore,
                    availability: availabilityScore,
                    cost: costScore,
                    quality: qualityScore
                }
            };
        });
        // Sort by composite score
        resourceScores.sort((a, b) => b.score - a.score);
        const bestResource = resourceScores[0];
        if (!bestResource) {
            throw new Error('No suitable resources found for hybrid optimization');
        }
        const reasoning = [
            `Hybrid optimization selected resource with composite score: ${bestResource.score.toFixed(3)}`,
            `Skill match: ${(bestResource.breakdown.skill * 100).toFixed(1)}%`,
            `Performance: ${(bestResource.breakdown.performance * 100).toFixed(1)}%`,
            `Availability: ${(bestResource.breakdown.availability * 100).toFixed(1)}%`,
            `Cost efficiency: ${(bestResource.breakdown.cost * 100).toFixed(1)}%`,
            `Quality: ${(bestResource.breakdown.quality * 100).toFixed(1)}%`
        ];
        return this.createRoutingDecision(taskData, bestResource.resource, intelligent_workflow_enum_1.IntelligentRoutingStrategy.HYBRID_OPTIMIZATION, intelligent_workflow_enum_1.RoutingConfidenceLevel.VERY_HIGH, bestResource.score, reasoning, resourceScores.slice(1, 4).map(rs => this.createAlternativeOption(rs.resource, intelligent_workflow_enum_1.IntelligentRoutingStrategy.HYBRID_OPTIMIZATION)));
    }
    /**
     * Create routing decision object
     */
    createRoutingDecision(taskData, resource, strategy, confidence, confidenceScore, reasoning, alternatives) {
        return {
            taskId: taskData.id,
            assignedResource: resource.id,
            routingStrategy: strategy,
            confidence,
            confidenceScore,
            reasoning,
            alternativeOptions: alternatives,
            expectedOutcome: this.calculateExpectedOutcome(taskData, resource),
            riskAssessment: this.assessRoutingRisk(taskData, resource),
            qualityPrediction: this.predictQuality(taskData, resource),
            performancePrediction: this.predictPerformance(taskData, resource),
            decisionTimestamp: new Date(),
            executionPlan: this.createExecutionPlan(taskData, resource)
        };
    }
    /**
     * Create alternative option
     */
    createAlternativeOption(resource, strategy) {
        return {
            resource: resource.id,
            strategy,
            confidence: resource.performance,
            expectedCost: resource.cost,
            expectedTime: 1 / resource.performance, // Inverse relationship
            expectedQuality: resource.quality,
            riskLevel: 1 - resource.reliability,
            reasoning: `Alternative resource with ${(resource.performance * 100).toFixed(1)}% performance`
        };
    }
    /**
     * Calculate expected outcome
     */
    calculateExpectedOutcome(taskData, resource) {
        const baseDuration = this.estimateTaskDuration(taskData);
        const adjustedDuration = baseDuration / resource.performance;
        return {
            successProbability: resource.reliability,
            expectedDuration: adjustedDuration,
            expectedCost: resource.cost * adjustedDuration,
            expectedQuality: resource.quality,
            expectedUserSatisfaction: (resource.performance + resource.quality) / 2,
            riskLevel: 1 - resource.reliability,
            confidenceInterval: {
                lower: adjustedDuration * 0.8,
                upper: adjustedDuration * 1.2,
                confidence: 0.8
            }
        };
    }
    /**
     * Assess routing risk
     */
    assessRoutingRisk(taskData, resource) {
        const taskAnalysis = {
            complexity: this.calculateTaskComplexity(taskData),
            riskFactors: this.identifyRiskFactors(taskData)
        };
        return {
            overallRisk: this.calculateOverallRisk(taskAnalysis, resource),
            performanceRisk: 1 - resource.performance,
            qualityRisk: 1 - resource.quality,
            costRisk: resource.cost > 150 ? 0.7 : 0.3,
            timeRisk: taskAnalysis.riskFactors.includes('tight_deadline') ? 0.8 : 0.3,
            complianceRisk: 0.2, // Simplified
            securityRisk: 0.1, // Simplified
            mitigationStrategies: this.getMitigationStrategies(taskAnalysis, resource),
            contingencyPlans: this.getContingencyPlans(taskAnalysis, resource)
        };
    }
    /**
     * Calculate overall risk
     */
    calculateOverallRisk(taskAnalysis, resource) {
        let risk = 0;
        // Task complexity risk
        const complexityRisks = {
            [intelligent_workflow_enum_1.TaskComplexityLevel.TRIVIAL]: 0.1,
            [intelligent_workflow_enum_1.TaskComplexityLevel.SIMPLE]: 0.2,
            [intelligent_workflow_enum_1.TaskComplexityLevel.MODERATE]: 0.4,
            [intelligent_workflow_enum_1.TaskComplexityLevel.COMPLEX]: 0.6,
            [intelligent_workflow_enum_1.TaskComplexityLevel.VERY_COMPLEX]: 0.8,
            [intelligent_workflow_enum_1.TaskComplexityLevel.EXTREMELY_COMPLEX]: 0.9
        };
        risk += complexityRisks[taskAnalysis.complexity] || 0.5;
        // Resource reliability risk
        risk += (1 - resource.reliability) * 0.5;
        // Risk factors
        risk += taskAnalysis.riskFactors.length * 0.1;
        return Math.min(1, risk);
    }
    /**
     * Get mitigation strategies
     */
    getMitigationStrategies(taskAnalysis, resource) {
        const strategies = [];
        if (resource.performance < 0.7) {
            strategies.push('Provide additional training and support');
        }
        if (taskAnalysis.riskFactors.includes('tight_deadline')) {
            strategies.push('Allocate additional resources if needed');
        }
        if (taskAnalysis.complexity === intelligent_workflow_enum_1.TaskComplexityLevel.VERY_COMPLEX ||
            taskAnalysis.complexity === intelligent_workflow_enum_1.TaskComplexityLevel.EXTREMELY_COMPLEX) {
            strategies.push('Break down into smaller subtasks');
            strategies.push('Assign senior resource for oversight');
        }
        return strategies;
    }
    /**
     * Get contingency plans
     */
    getContingencyPlans(taskAnalysis, resource) {
        const plans = [];
        plans.push('Escalate to supervisor if issues arise');
        plans.push('Have backup resource on standby');
        if (taskAnalysis.riskFactors.includes('tight_deadline')) {
            plans.push('Prepare to allocate additional resources');
        }
        return plans;
    }
    /**
     * Predict quality outcome
     */
    predictQuality(taskData, resource) {
        return {
            predictedQuality: this.mapQualityScore(resource.quality),
            qualityScore: resource.quality,
            qualityFactors: {
                resourceQuality: resource.quality,
                skillMatch: this.calculateSkillMatchScore(this.extractRequiredSkills(taskData), resource.skills),
                complexity: this.getComplexityFactor(this.calculateTaskComplexity(taskData))
            },
            improvementSuggestions: this.getQualityImprovementSuggestions(resource),
            qualityRisks: this.getQualityRisks(taskData, resource),
            qualityAssuranceMeasures: this.getQualityAssuranceMeasures()
        };
    }
    /**
     * Map quality score to quality enum
     */
    mapQualityScore(score) {
        if (score >= 0.9)
            return 'excellent';
        if (score >= 0.8)
            return 'very_good';
        if (score >= 0.7)
            return 'good';
        if (score >= 0.6)
            return 'fair';
        return 'poor';
    }
    /**
     * Get complexity factor for quality prediction
     */
    getComplexityFactor(complexity) {
        const factors = {
            [intelligent_workflow_enum_1.TaskComplexityLevel.TRIVIAL]: 1.0,
            [intelligent_workflow_enum_1.TaskComplexityLevel.SIMPLE]: 0.9,
            [intelligent_workflow_enum_1.TaskComplexityLevel.MODERATE]: 0.8,
            [intelligent_workflow_enum_1.TaskComplexityLevel.COMPLEX]: 0.7,
            [intelligent_workflow_enum_1.TaskComplexityLevel.VERY_COMPLEX]: 0.6,
            [intelligent_workflow_enum_1.TaskComplexityLevel.EXTREMELY_COMPLEX]: 0.5
        };
        return factors[complexity] || 0.7;
    }
    /**
     * Get quality improvement suggestions
     */
    getQualityImprovementSuggestions(resource) {
        const suggestions = [];
        if (resource.performance < 0.8) {
            suggestions.push('Provide performance coaching');
        }
        if (resource.quality < 0.8) {
            suggestions.push('Implement quality checkpoints');
            suggestions.push('Assign quality reviewer');
        }
        return suggestions;
    }
    /**
     * Get quality risks
     */
    getQualityRisks(taskData, resource) {
        const risks = [];
        if (resource.quality < 0.7) {
            risks.push('Below-standard quality delivery');
        }
        const complexity = this.calculateTaskComplexity(taskData);
        if (complexity === intelligent_workflow_enum_1.TaskComplexityLevel.VERY_COMPLEX ||
            complexity === intelligent_workflow_enum_1.TaskComplexityLevel.EXTREMELY_COMPLEX) {
            risks.push('Quality degradation due to high complexity');
        }
        return risks;
    }
    /**
     * Get quality assurance measures
     */
    getQualityAssuranceMeasures() {
        return [
            'Regular progress reviews',
            'Quality checkpoints at milestones',
            'Peer review process',
            'Automated quality checks where applicable',
            'Customer feedback collection'
        ];
    }
    /**
     * Predict performance outcome
     */
    predictPerformance(taskData, resource) {
        const baseDuration = this.estimateTaskDuration(taskData);
        return {
            expectedThroughput: resource.performance,
            expectedLatency: baseDuration / resource.performance,
            expectedResourceUsage: resource.currentUtilization + 0.1, // Assume 10% increase
            expectedErrorRate: (1 - resource.reliability) * 0.1,
            performanceBottlenecks: this.identifyPerformanceBottlenecks(resource),
            optimizationOpportunities: this.identifyOptimizationOpportunities(resource)
        };
    }
    /**
     * Identify performance bottlenecks
     */
    identifyPerformanceBottlenecks(resource) {
        const bottlenecks = [];
        if (resource.currentUtilization > 0.8) {
            bottlenecks.push('High resource utilization');
        }
        if (resource.performance < 0.7) {
            bottlenecks.push('Low resource performance');
        }
        return bottlenecks;
    }
    /**
     * Identify optimization opportunities
     */
    identifyOptimizationOpportunities(resource) {
        const opportunities = [];
        if (resource.performance < 0.9) {
            opportunities.push('Performance improvement training');
        }
        if (resource.currentUtilization < 0.5) {
            opportunities.push('Increase task allocation');
        }
        return opportunities;
    }
    /**
     * Create execution plan
     */
    createExecutionPlan(taskData, resource) {
        const estimatedDuration = this.estimateTaskDuration(taskData);
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + estimatedDuration * 3600000);
        return {
            steps: this.createExecutionSteps(taskData),
            dependencies: taskData.dependencies || [],
            prerequisites: this.identifyPrerequisites(taskData),
            resources: [resource.id],
            timeline: {
                startTime,
                endTime,
                milestones: this.createMilestones(taskData, startTime, endTime),
                criticalPath: ['step_1', 'step_2', 'step_3'], // Simplified
                bufferTime: estimatedDuration * 0.2 // 20% buffer
            },
            checkpoints: this.createCheckpoints(taskData, startTime, endTime),
            rollbackPlan: this.createRollbackPlan(taskData)
        };
    }
    /**
     * Create execution steps
     */
    createExecutionSteps(taskData) {
        return [
            {
                id: 'step_1',
                name: 'Task Initialization',
                description: 'Initialize task and prepare resources',
                order: 1,
                estimatedDuration: 0.25,
                requiredResources: [],
                dependencies: [],
                successCriteria: ['Resources allocated', 'Task environment prepared'],
                failureCriteria: ['Resource unavailable', 'Environment setup failed'],
                rollbackActions: ['Release resources', 'Clean up environment']
            },
            {
                id: 'step_2',
                name: 'Task Execution',
                description: 'Execute main task activities',
                order: 2,
                estimatedDuration: this.estimateTaskDuration(taskData) * 0.7,
                requiredResources: [],
                dependencies: ['step_1'],
                successCriteria: ['Task completed successfully', 'Quality standards met'],
                failureCriteria: ['Task failed', 'Quality below threshold'],
                rollbackActions: ['Revert changes', 'Restore previous state']
            },
            {
                id: 'step_3',
                name: 'Task Completion',
                description: 'Finalize task and update status',
                order: 3,
                estimatedDuration: 0.25,
                requiredResources: [],
                dependencies: ['step_2'],
                successCriteria: ['Task marked complete', 'Documentation updated'],
                failureCriteria: ['Completion failed', 'Documentation incomplete'],
                rollbackActions: ['Mark as incomplete', 'Update status']
            }
        ];
    }
    /**
     * Identify prerequisites
     */
    identifyPrerequisites(taskData) {
        const prerequisites = [];
        if (taskData.dependencies && taskData.dependencies.length > 0) {
            prerequisites.push('Complete dependent tasks');
        }
        if (taskData.requiredSkills && taskData.requiredSkills.length > 0) {
            prerequisites.push('Verify required skills available');
        }
        prerequisites.push('Allocate necessary resources');
        prerequisites.push('Prepare task environment');
        return prerequisites;
    }
    /**
     * Create milestones
     */
    createMilestones(taskData, startTime, endTime) {
        const duration = endTime.getTime() - startTime.getTime();
        return [
            {
                id: 'milestone_1',
                name: 'Task Started',
                description: 'Task execution has begun',
                targetDate: startTime,
                dependencies: [],
                successCriteria: ['Task initialized', 'Resources allocated'],
                deliverables: ['Task plan', 'Resource allocation']
            },
            {
                id: 'milestone_2',
                name: 'Halfway Point',
                description: '50% of task completed',
                targetDate: new Date(startTime.getTime() + duration * 0.5),
                dependencies: ['milestone_1'],
                successCriteria: ['50% progress achieved', 'On track for completion'],
                deliverables: ['Progress report', 'Interim results']
            },
            {
                id: 'milestone_3',
                name: 'Task Completed',
                description: 'Task fully completed',
                targetDate: endTime,
                dependencies: ['milestone_2'],
                successCriteria: ['100% completion', 'Quality standards met'],
                deliverables: ['Final deliverable', 'Completion report']
            }
        ];
    }
    /**
     * Create checkpoints
     */
    createCheckpoints(taskData, startTime, endTime) {
        const duration = endTime.getTime() - startTime.getTime();
        return [
            {
                id: 'checkpoint_1',
                name: 'Initial Check',
                description: 'Verify task setup and readiness',
                checkTime: new Date(startTime.getTime() + duration * 0.1),
                criteria: ['Resources ready', 'Environment prepared'],
                actions: ['Proceed with execution', 'Address any issues'],
                escalationProcedure: 'Escalate to supervisor if setup issues persist'
            },
            {
                id: 'checkpoint_2',
                name: 'Progress Check',
                description: 'Review progress and quality',
                checkTime: new Date(startTime.getTime() + duration * 0.5),
                criteria: ['On schedule', 'Quality acceptable'],
                actions: ['Continue execution', 'Adjust if needed'],
                escalationProcedure: 'Escalate if behind schedule or quality issues'
            },
            {
                id: 'checkpoint_3',
                name: 'Final Check',
                description: 'Verify completion and quality',
                checkTime: new Date(startTime.getTime() + duration * 0.9),
                criteria: ['Task complete', 'Quality standards met'],
                actions: ['Finalize task', 'Update status'],
                escalationProcedure: 'Escalate if completion or quality issues'
            }
        ];
    }
    /**
     * Create rollback plan
     */
    createRollbackPlan(taskData) {
        return {
            triggers: [
                'Task failure',
                'Quality below threshold',
                'Resource unavailability',
                'Deadline missed',
                'Critical error'
            ],
            steps: [
                'Stop current execution',
                'Assess current state',
                'Identify rollback point',
                'Execute rollback actions',
                'Verify rollback success',
                'Update task status',
                'Notify stakeholders'
            ],
            dataBackup: true,
            notificationProcedure: 'Notify task owner and supervisor immediately',
            recoveryTime: 0.5, // 30 minutes
            validationSteps: [
                'Verify system state',
                'Check data integrity',
                'Confirm resource availability',
                'Validate rollback completion'
            ]
        };
    }
    /**
     * Validate routing decision
     */
    async validateRoutingDecision(decision) {
        // Validate confidence level
        if (decision.confidenceScore < this.getConfidenceThreshold()) {
            console.warn(`Low confidence routing decision: ${decision.confidenceScore}`);
        }
        // Validate resource availability
        const resource = await this.getResourceInfo(decision.assignedResource);
        if (!this.isResourceAvailable(resource, {})) {
            throw new Error(`Assigned resource ${decision.assignedResource} is not available`);
        }
        // Validate expected outcome
        if (decision.expectedOutcome.successProbability < 0.5) {
            console.warn(`Low success probability: ${decision.expectedOutcome.successProbability}`);
        }
        return decision;
    }
    /**
     * Get confidence threshold based on current setting
     */
    getConfidenceThreshold() {
        const thresholds = {
            [intelligent_workflow_enum_1.RoutingConfidenceLevel.VERY_LOW]: 0.2,
            [intelligent_workflow_enum_1.RoutingConfidenceLevel.LOW]: 0.4,
            [intelligent_workflow_enum_1.RoutingConfidenceLevel.MEDIUM]: 0.6,
            [intelligent_workflow_enum_1.RoutingConfidenceLevel.HIGH]: 0.8,
            [intelligent_workflow_enum_1.RoutingConfidenceLevel.VERY_HIGH]: 0.9,
            [intelligent_workflow_enum_1.RoutingConfidenceLevel.CERTAIN]: 0.95
        };
        return thresholds[this.confidenceThreshold] || 0.8;
    }
    /**
     * Update performance metrics
     */
    async updatePerformanceMetrics(decision, processingTime) {
        this.totalTasksRouted++;
        this.averageProcessingTime = (this.averageProcessingTime * (this.totalTasksRouted - 1) + processingTime) / this.totalTasksRouted;
        this.averageConfidence = (this.averageConfidence * (this.totalTasksRouted - 1) + decision.confidenceScore) / this.totalTasksRouted;
        // Update resource utilization
        const resourceId = decision.assignedResource;
        this.resourceUtilization[resourceId] = (this.resourceUtilization[resourceId] || 0) + 0.1;
        this.updatedAt = new Date();
    }
    /**
     * Learn from routing decision
     */
    async learnFromRouting(taskData, decision) {
        const learningRecord = {
            timestamp: new Date(),
            taskId: taskData.id,
            strategy: decision.routingStrategy,
            confidence: decision.confidenceScore,
            assignedResource: decision.assignedResource,
            expectedOutcome: decision.expectedOutcome,
            actualOutcome: null, // Will be updated when task completes
            learningPoints: this.extractLearningPoints(taskData, decision)
        };
        this.learningHistory.push(learningRecord);
        // Keep only last 1000 learning records
        if (this.learningHistory.length > 1000) {
            this.learningHistory = this.learningHistory.slice(-1000);
        }
    }
    /**
     * Extract learning points from routing decision
     */
    extractLearningPoints(taskData, decision) {
        const points = [];
        points.push(`Strategy: ${decision.routingStrategy}`);
        points.push(`Confidence: ${decision.confidenceScore.toFixed(3)}`);
        points.push(`Expected success: ${decision.expectedOutcome.successProbability.toFixed(3)}`);
        if (decision.alternativeOptions.length > 0) {
            points.push(`Alternatives considered: ${decision.alternativeOptions.length}`);
        }
        return points;
    }
    /**
     * Get default AI configuration
     */
    getDefaultAIConfiguration() {
        return {
            primaryModel: intelligent_workflow_enum_1.AIModelType.DEEPSEEK_R1,
            fallbackModels: [intelligent_workflow_enum_1.AIModelType.TENSORFLOW, intelligent_workflow_enum_1.AIModelType.RANDOM_FOREST],
            processingMode: intelligent_workflow_enum_1.AIProcessingMode.REAL_TIME_PROCESSING,
            confidenceThreshold: 0.8,
            safetyLevel: 5,
            learningEnabled: true,
            adaptationEnabled: true,
            autonomousDecisionEnabled: true,
            humanOversightRequired: false,
            modelTrainingConfig: {
                trainingDataSize: 10000,
                validationSplit: 0.2,
                testSplit: 0.1,
                epochs: 100,
                batchSize: 32,
                learningRate: 0.001,
                optimizerType: 'adam',
                lossFunction: 'categorical_crossentropy',
                metrics: ['accuracy', 'precision', 'recall'],
                earlyStoppingEnabled: true,
                hyperparameterTuning: true,
                crossValidation: true,
                regularization: {
                    l1Regularization: 0.01,
                    l2Regularization: 0.01,
                    dropoutRate: 0.2,
                    batchNormalization: true,
                    weightDecay: 0.0001
                }
            },
            performanceTargets: {
                accuracy: 0.9,
                precision: 0.85,
                recall: 0.85,
                f1Score: 0.85,
                auc: 0.9,
                latency: 100, // milliseconds
                throughput: 1000, // requests per second
                resourceUtilization: 0.8,
                qualityScore: 0.9,
                userSatisfaction: 0.85
            }
        };
    }
    /**
     * Get default routing configuration
     */
    getDefaultRoutingConfiguration() {
        return {
            strategy: intelligent_workflow_enum_1.IntelligentRoutingStrategy.HYBRID_OPTIMIZATION,
            fallbackStrategies: [
                intelligent_workflow_enum_1.IntelligentRoutingStrategy.PERFORMANCE_BASED,
                intelligent_workflow_enum_1.IntelligentRoutingStrategy.SKILL_MATCHING
            ],
            confidenceThreshold: intelligent_workflow_enum_1.RoutingConfidenceLevel.HIGH,
            resourceOptimization: this.getDefaultResourceOptimizationConfig(),
            skillMatching: this.getDefaultSkillMatchingConfig(),
            performanceWeights: this.getDefaultPerformanceWeights(),
            learningConfiguration: this.getDefaultLearningConfiguration(),
            adaptationSettings: {
                adaptationEnabled: true,
                adaptationFrequency: 'hourly',
                adaptationThresholds: {
                    performanceDegradation: 0.1,
                    qualityDegradation: 0.1,
                    costIncrease: 0.2,
                    timeIncrease: 0.15,
                    errorRateIncrease: 0.05,
                    userSatisfactionDecrease: 0.1,
                    complianceViolation: 0.01
                },
                adaptationStrategies: [],
                learningEnabled: true,
                feedbackMechanisms: [],
                performanceTracking: true,
                qualityAssurance: true
            },
            monitoringConfig: {
                monitoringTypes: [],
                monitoringFrequency: 'real_time',
                alertConfiguration: {
                    alertTypes: [],
                    severityLevels: [],
                    thresholds: {},
                    escalationRules: {
                        rules: [],
                        defaultEscalation: '',
                        timeBasedEscalation: false,
                        severityBasedEscalation: false,
                        frequencyBasedEscalation: false
                    },
                    suppressionRules: {
                        rules: [],
                        defaultSuppression: false,
                        timeBasedSuppression: false,
                        frequencyBasedSuppression: false,
                        dependencyBasedSuppression: false
                    },
                    notificationChannels: {
                        email: {
                            enabled: false,
                            smtpServer: '',
                            port: 587,
                            security: 'tls',
                            authentication: {
                                username: '',
                                password: '',
                                oauth: false,
                                tls: true
                            },
                            templates: {},
                            recipients: []
                        },
                        sms: {
                            enabled: false,
                            provider: '',
                            apiKey: '',
                            apiSecret: '',
                            templates: {},
                            recipients: []
                        },
                        slack: {
                            enabled: false,
                            webhookUrl: '',
                            channels: [],
                            templates: {},
                            mentions: []
                        },
                        webhook: {
                            enabled: false,
                            endpoints: [],
                            authentication: {
                                type: '',
                                credentials: {},
                                headers: {}
                            },
                            retryPolicy: {
                                maxRetries: 3,
                                retryDelay: 1000,
                                backoffStrategy: 'exponential',
                                retryConditions: []
                            },
                            timeout: 5000
                        },
                        dashboard: {
                            enabled: false,
                            displayDuration: 5000,
                            priority: 'medium',
                            position: 'top-right',
                            styling: {}
                        },
                        mobile: {
                            enabled: false,
                            pushNotifications: false,
                            appNotifications: false,
                            templates: {},
                            deviceTokens: []
                        }
                    },
                    intelligentFiltering: true,
                    anomalyDetection: true,
                    predictiveAlerting: true
                },
                metricsCollection: {
                    metricsEnabled: true,
                    collectionFrequency: 'real_time',
                    metricsTypes: [],
                    aggregationMethods: [],
                    retentionPeriod: 90,
                    storageConfiguration: {
                        storageType: 'mongodb',
                        connectionString: '',
                        database: 'metrics',
                        collection: 'routing_metrics',
                        indexing: true,
                        compression: true,
                        encryption: true
                    }
                },
                predictiveAnalytics: {
                    enabled: true,
                    models: [],
                    predictionHorizon: 24,
                    updateFrequency: 'hourly',
                    accuracyThreshold: 0.8,
                    alertOnPrediction: true
                },
                prescriptiveAnalytics: {
                    enabled: true,
                    optimizationModels: [],
                    recommendationEngine: {
                        enabled: true,
                        algorithms: [],
                        dataSource: '',
                        updateFrequency: 'hourly',
                        personalizedRecommendations: true,
                        contextualRecommendations: true,
                        collaborativeFiltering: true,
                        contentBasedFiltering: true
                    },
                    actionGeneration: {
                        enabled: true,
                        actionTypes: [],
                        generationRules: [],
                        approvalRequired: false,
                        executionDelay: 0,
                        rollbackEnabled: true
                    },
                    impactAssessment: true,
                    automaticExecution: false
                },
                dashboards: [],
                reporting: {
                    enabled: true,
                    reports: [],
                    schedules: [],
                    distribution: {
                        channels: [],
                        recipients: [],
                        templates: {},
                        attachments: true,
                        compression: false
                    },
                    templates: []
                }
            }
        };
    }
    /**
     * Get default performance weights
     */
    getDefaultPerformanceWeights() {
        return {
            accuracy: 0.2,
            speed: 0.15,
            cost: 0.15,
            quality: 0.2,
            reliability: 0.15,
            availability: 0.1,
            scalability: 0.05,
            userSatisfaction: 0.1,
            resourceEfficiency: 0.05,
            complianceScore: 0.05
        };
    }
    /**
     * Get default skill matching configuration
     */
    getDefaultSkillMatchingConfig() {
        return {
            algorithm: intelligent_workflow_enum_1.SkillMatchingAlgorithm.HYBRID_FILTERING,
            skillWeights: {},
            experienceWeights: {},
            certificationWeights: {},
            performanceWeights: {},
            availabilityWeights: {},
            matchingThreshold: 0.7,
            fuzzyMatchingEnabled: true,
            semanticMatchingEnabled: true,
            learningEnabled: true
        };
    }
    /**
     * Get default resource optimization configuration
     */
    getDefaultResourceOptimizationConfig() {
        return {
            strategy: intelligent_workflow_enum_1.ResourceOptimizationStrategy.BALANCED_OPTIMIZATION,
            objectives: [],
            constraints: {
                maxCost: 1000,
                maxTime: 24,
                minQuality: 0.8,
                maxResourceUsage: 0.9,
                availabilityRequirements: 0.95,
                complianceRequirements: [],
                securityRequirements: []
            },
            costTargets: {
                maxCostPerTask: 100,
                maxCostPerHour: 50,
                maxCostPerDay: 1000,
                costReductionTarget: 0.1,
                budgetConstraints: 10000,
                costEfficiencyTarget: 0.8
            },
            performanceTargets: {
                accuracy: 0.9,
                precision: 0.85,
                recall: 0.85,
                f1Score: 0.85,
                auc: 0.9,
                latency: 100,
                throughput: 1000,
                resourceUtilization: 0.8,
                qualityScore: 0.9,
                userSatisfaction: 0.85
            },
            qualityTargets: {
                minAccuracy: 0.8,
                minCompleteness: 0.9,
                minConsistency: 0.85,
                maxErrorRate: 0.05,
                qualityImprovementTarget: 0.1,
                userSatisfactionTarget: 0.85
            },
            scalabilityRequirements: {
                maxConcurrentTasks: 1000,
                maxThroughput: 10000,
                horizontalScaling: true,
                verticalScaling: true,
                autoScaling: true,
                loadBalancing: true
            }
        };
    }
    /**
     * Get default learning configuration
     */
    getDefaultLearningConfiguration() {
        return {
            mechanism: LearningMechanism.REINFORCEMENT_LEARNING,
            learningRate: 0.01,
            explorationRate: 0.1,
            exploitationRate: 0.9,
            rewardFunction: {
                successReward: 10,
                qualityReward: 5,
                speedReward: 3,
                costReward: 2,
                userSatisfactionReward: 8,
                complianceReward: 6,
                innovationReward: 4
            },
            penaltyFunction: {
                failurePenalty: -10,
                qualityPenalty: -5,
                delayPenalty: -3,
                costPenalty: -2,
                compliancePenalty: -8,
                securityPenalty: -10
            },
            memorySize: 10000,
            batchSize: 32,
            updateFrequency: 100,
            convergenceThreshold: 0.001
        };
    }
    /**
     * Generate unique ID
     */
    generateId() {
        return `itr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Convert to JSON
     */
    toJSON() {
        return {
            id: this.id,
            tenantId: this.tenantId,
            name: this.name,
            description: this.description,
            version: this.version,
            intelligenceLevel: this.intelligenceLevel,
            automationLevel: this.automationLevel,
            aiConfiguration: this.aiConfiguration,
            routingConfiguration: this.routingConfiguration,
            currentStrategy: this.currentStrategy,
            performanceMetrics: {
                totalTasksRouted: this.totalTasksRouted,
                successfulRoutings: this.successfulRoutings,
                failedRoutings: this.failedRoutings,
                averageConfidence: this.averageConfidence,
                averageProcessingTime: this.averageProcessingTime,
                qualityScore: this.qualityScore,
                userSatisfactionScore: this.userSatisfactionScore
            },
            resourceManagement: {
                availableResources: this.availableResources,
                resourceUtilization: this.resourceUtilization,
                resourcePerformance: this.resourcePerformance
            },
            currentState: {
                currentLoad: this.currentLoad,
                queueSize: this.queueSize,
                processingStatus: this.processingStatus
            },
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            isActive: this.isActive
        };
    }
}
exports.IntelligentTaskRoutingEntity = IntelligentTaskRoutingEntity;
//# sourceMappingURL=intelligent-task-routing.entity.js.map