import { ProjectManager } from './projectManager';
import { TeamCoordinator } from './teamCoordinator';
import { RoleManager } from './roleManager';
import { MemoryService } from './memoryService';
import { PromptService } from './promptService';
import { WebSocketService } from './websocketService';
import { logger } from '../utils/logger';

export class MetaGPTService {
  private static instance: MetaGPTService;
  private projectManager: ProjectManager;
  private teamCoordinator: TeamCoordinator;
  private roleManager: RoleManager;
  private memoryService: MemoryService;
  private promptService: PromptService;
  private websocketService: WebSocketService;

  private constructor() {
    this.projectManager = ProjectManager.getInstance();
    this.teamCoordinator = TeamCoordinator.getInstance();
    this.roleManager = RoleManager.getInstance();
    this.memoryService = MemoryService.getInstance();
    this.promptService = PromptService.getInstance();
    this.websocketService = WebSocketService.getInstance();
  }

  static getInstance(): MetaGPTService {
    if (!MetaGPTService.instance) {
      MetaGPTService.instance = new MetaGPTService();
    }
    return MetaGPTService.instance;
  }

  async initializeProject(name: string, type: string, requirements: string[]) {
    try {
      logger.info(`Initializing project: ${name}`);
      return await this.projectManager.initializeProject(name, type, requirements);
    } catch (error) {
      logger.error('Error initializing project:', error);
      throw error;
    }
  }

  async processTeamRequest(projectId: string, message: string) {
    try {
      // Get project status
      const project = await this.projectManager.getProjectStatus(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Determine relevant roles for the request
      const relevantRoles = await this.roleManager.getRelevantRoles(projectId, message);

      // Process request through the team coordinator
      const teamResponses = await Promise.all(
        project.teams.map(async team => {
          // Only process if team has relevant roles
          const teamRoles = team.status.roleAssignments
            .filter(([role]) => relevantRoles.includes(role))
            .map(([role]) => role);

          if (teamRoles.length > 0) {
            return this.teamCoordinator.processTeamRequest(projectId, message);
          }
          return null;
        })
      );

      // Filter out null responses and combine results
      const responses = teamResponses.filter(Boolean);

      // Store interaction in memory
      await this.memoryService.addToMemory(projectId, {
        role: 'system',
        content: JSON.stringify({ message, responses }),
        timestamp: new Date()
      });

      return responses;
    } catch (error) {
      logger.error('Error processing team request:', error);
      throw error;
    }
  }

  async updateProjectStatus(projectId: string, status: 'planning' | 'in-progress' | 'reviewing' | 'completed') {
    try {
      await this.projectManager.updateProjectStatus(projectId, status);
      
      // Notify all project teams
      const project = await this.projectManager.getProjectStatus(projectId);
      project.teams.forEach(team => {
        this.websocketService.broadcastToTeam(team.teamId, 'project_status_update', {
          projectId,
          status,
          timestamp: new Date()
        });
      });
    } catch (error) {
      logger.error('Error updating project status:', error);
      throw error;
    }
  }

  async addProjectRequirement(projectId: string, requirement: string) {
    try {
      await this.projectManager.addProjectRequirement(projectId, requirement);
      
      // Generate prompts for affected roles
      const relevantRoles = await this.roleManager.getRelevantRoles(projectId, requirement);
      
      const prompts = await Promise.all(
        relevantRoles.map(role => 
          this.promptService.generatePrompt(role, 'analyze', {
            projectId,
            requirement
          })
        )
      );

      // Process requirement through team coordinator
      await this.processTeamRequest(projectId, requirement);

      return {
        requirement,
        affectedRoles: relevantRoles,
        prompts
      };
    } catch (error) {
      logger.error('Error adding project requirement:', error);
      throw error;
    }
  }

  async generateProjectInsights(projectId: string) {
    try {
      const insights = await this.projectManager.generateProjectInsights(projectId);
      
      // Enhance insights with role-specific analysis
      const enhancedInsights = {
        ...insights,
        roleAnalysis: await Promise.all(
          insights.teams.flatMap(team => 
            team.roles.map(async role => ({
              role: role.name,
              expertise: await this.roleManager.getRoleExpertise(role.name),
              performance: await this.analyzeRolePerformance(projectId, role.name)
            }))
          )
        )
      };

      return enhancedInsights;
    } catch (error) {
      logger.error('Error generating project insights:', error);
      throw error;
    }
  }

  private async analyzeRolePerformance(projectId: string, roleName: string) {
    const context = await this.memoryService.getRelevantContext(projectId, roleName);
    
    // Calculate performance metrics
    const interactions = context.length;
    const lastActive = context[context.length - 1]?.timestamp;
    const responseTimes = context
      .filter((entry, i) => i > 0)
      .map((entry, i) => 
        new Date(entry.timestamp).getTime() - new Date(context[i].timestamp).getTime()
      );

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    return {
      interactions,
      lastActive,
      avgResponseTime,
      status: this.calculatePerformanceStatus(interactions, avgResponseTime)
    };
  }

  private calculatePerformanceStatus(interactions: number, avgResponseTime: number): 'excellent' | 'good' | 'fair' | 'poor' {
    // Define thresholds
    const INTERACTION_THRESHOLD = 10;
    const RESPONSE_TIME_THRESHOLD = 5000; // 5 seconds

    if (interactions > INTERACTION_THRESHOLD && avgResponseTime < RESPONSE_TIME_THRESHOLD) {
      return 'excellent';
    } else if (interactions > INTERACTION_THRESHOLD/2 && avgResponseTime < RESPONSE_TIME_THRESHOLD*2) {
      return 'good';
    } else if (interactions > INTERACTION_THRESHOLD/4 && avgResponseTime < RESPONSE_TIME_THRESHOLD*4) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  async getSystemStatus(): Promise<any> {
    try {
      const activeProjects = await Promise.all(
        Array.from(this.projectManager['projects'].keys()).map(projectId => 
          this.projectManager.getProjectStatus(projectId)
        )
      );

      const systemLoad = this.calculateSystemLoad(activeProjects);
      const memoryUsage = await this.getMemoryUsage();
      const activeTeams = this.websocketService.getActiveTeams();

      return {
        status: 'operational',
        activeProjects: activeProjects.length,
        activeTeams: activeTeams.length,
        systemLoad,
        memoryUsage,
        uptime: process.uptime(),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting system status:', error);
      throw error;
    }
  }

  private calculateSystemLoad(projects: any[]): number {
    // Calculate system load based on active projects and their complexity
    return projects.reduce((load, project) => 
      load + (project.metadata.complexity || 1) * 
      (project.teams.length || 1) * 
      (project.status === 'in-progress' ? 1 : 0.5)
    , 0);
  }

  private async getMemoryUsage(): Promise<any> {
    const used = process.memoryUsage();
    return {
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024),
      rss: Math.round(used.rss / 1024 / 1024)
    };
  }
}