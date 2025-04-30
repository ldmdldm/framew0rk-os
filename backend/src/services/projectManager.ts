import { TeamCoordinator } from './teamCoordinator';
import { RoleManager } from './roleManager';
import { MemoryService } from './memoryService';
import { WebSocketService } from './websocketService';
import { logger } from '../utils/logger';

interface ProjectConfig {
  id: string;
  name: string;
  type: string;
  requirements: string[];
  teams: Map<string, string[]>; // teamId -> roleNames
  status: 'planning' | 'in-progress' | 'reviewing' | 'completed';
  metadata: any;
}

export class ProjectManager {
  private static instance: ProjectManager;
  private projects: Map<string, ProjectConfig>;
  private teamCoordinator: TeamCoordinator;
  private roleManager: RoleManager;
  private memoryService: MemoryService;
  private websocketService: WebSocketService;

  private constructor() {
    this.projects = new Map();
    this.teamCoordinator = TeamCoordinator.getInstance();
    this.roleManager = RoleManager.getInstance();
    this.memoryService = MemoryService.getInstance();
    this.websocketService = WebSocketService.getInstance();
  }

  static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  async initializeProject(name: string, type: string, requirements: string[]) {
    try {
      const projectId = `proj-${Date.now()}`;
      
      // Analyze requirements and determine optimal team structure
      const teamStructures = await this.analyzeProjectRequirements(requirements);

      // Create project configuration
      const project: ProjectConfig = {
        id: projectId,
        name,
        type,
        requirements,
        teams: new Map(),
        status: 'planning',
        metadata: {
          createdAt: new Date(),
          lastUpdated: new Date(),
          complexity: this.calculateProjectComplexity(requirements)
        }
      };

      // Initialize teams based on requirements analysis
      for (const [teamId, roles] of teamStructures) {
        project.teams.set(teamId, roles);
        await this.teamCoordinator.initializeTeamWorkflow(teamId, requirements.join('\n'));
      }

      this.projects.set(projectId, project);

      // Initialize project memory context
      await this.memoryService.initializeContext(projectId, ['system'], {
        projectType: type,
        requirements
      });

      logger.info(`Initialized project ${name} with ID ${projectId}`);
      return project;
    } catch (error) {
      logger.error('Error initializing project:', error);
      throw error;
    }
  }

  private async analyzeProjectRequirements(requirements: string[]): Promise<Map<string, string[]>> {
    const teamStructures = new Map<string, string[]>();
    
    try {
      // Analyze each requirement to determine needed roles
      for (const requirement of requirements) {
        const relevantRoles = await this.roleManager.getRelevantRoles('temp', requirement);
        
        // Group roles into logical teams based on dependencies and interactions
        const teams = this.organizeRolesIntoTeams(relevantRoles, requirement);
        
        // Merge team structures
        for (const [teamId, roles] of teams) {
          const existingRoles = teamStructures.get(teamId) || [];
          teamStructures.set(teamId, [...new Set([...existingRoles, ...roles])]);
        }
      }

      return teamStructures;
    } catch (error) {
      logger.error('Error analyzing project requirements:', error);
      throw error;
    }
  }

  private organizeRolesIntoTeams(roles: string[], requirement: string): Map<string, string[]> {
    const teams = new Map<string, string[]>();
    
    // Core development team
    const developmentRoles = roles.filter(role => 
      ['architect', 'developer', 'reviewer'].includes(role)
    );
    if (developmentRoles.length > 0) {
      teams.set('dev-team', developmentRoles);
    }

    // QA and testing team
    const qaRoles = roles.filter(role => 
      ['tester', 'qa', 'security'].includes(role)
    );
    if (qaRoles.length > 0) {
      teams.set('qa-team', qaRoles);
    }

    // Project management team
    const managementRoles = roles.filter(role => 
      ['manager', 'coordinator', 'analyst'].includes(role)
    );
    if (managementRoles.length > 0) {
      teams.set('mgmt-team', managementRoles);
    }

    return teams;
  }

  private calculateProjectComplexity(requirements: string[]): number {
    let complexity = 0;
    
    // Analyze requirements for complexity factors
    for (const req of requirements) {
      if (req.includes('security') || req.includes('encryption')) complexity += 2;
      if (req.includes('scale') || req.includes('performance')) complexity += 2;
      if (req.includes('integration') || req.includes('api')) complexity += 1;
      if (req.includes('real-time') || req.includes('concurrent')) complexity += 2;
      if (req.includes('machine learning') || req.includes('ai')) complexity += 3;
    }

    return Math.min(10, complexity); // Scale from 0-10
  }

  async updateProjectStatus(projectId: string, newStatus: ProjectConfig['status']) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    project.status = newStatus;
    project.metadata.lastUpdated = new Date();

    // Notify all teams of status change
    for (const teamId of project.teams.keys()) {
      this.websocketService.broadcastToTeam(teamId, 'project_status_update', {
        projectId,
        status: newStatus,
        timestamp: new Date()
      });
    }
  }

  async getProjectStatus(projectId: string) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Gather status from all teams
    const teamStatuses = await Promise.all(
      Array.from(project.teams.keys()).map(async teamId => ({
        teamId,
        status: await this.teamCoordinator.getWorkflowStatus(teamId)
      }))
    );

    // Calculate overall project progress
    const overallProgress = teamStatuses.reduce(
      (sum, team) => sum + team.status.overallProgress,
      0
    ) / teamStatuses.length;

    return {
      projectId,
      name: project.name,
      status: project.status,
      progress: overallProgress,
      teams: teamStatuses,
      metadata: project.metadata
    };
  }

  async reassignTeamRoles(projectId: string, teamId: string, newRoles: string[]) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    if (!project.teams.has(teamId)) {
      throw new Error(`Team ${teamId} not found in project ${projectId}`);
    }

    // Update team roles
    project.teams.set(teamId, newRoles);

    // Reinitialize team workflow with new roles
    await this.teamCoordinator.initializeTeamWorkflow(
      teamId,
      project.requirements.join('\n')
    );

    // Update project metadata
    project.metadata.lastUpdated = new Date();
    project.metadata.roleChanges = [
      ...(project.metadata.roleChanges || []),
      {
        teamId,
        roles: newRoles,
        timestamp: new Date()
      }
    ];

    // Notify team members
    this.websocketService.broadcastToTeam(teamId, 'team_roles_updated', {
      projectId,
      teamId,
      roles: newRoles,
      timestamp: new Date()
    });
  }

  async addProjectRequirement(projectId: string, requirement: string) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Add new requirement
    project.requirements.push(requirement);

    // Analyze new requirement and update team structures if needed
    const newTeamStructures = await this.analyzeProjectRequirements([requirement]);
    
    // Update existing teams with new roles if necessary
    for (const [teamId, newRoles] of newTeamStructures) {
      const existingRoles = project.teams.get(teamId) || [];
      const updatedRoles = [...new Set([...existingRoles, ...newRoles])];
      await this.reassignTeamRoles(projectId, teamId, updatedRoles);
    }

    // Update project metadata
    project.metadata.lastUpdated = new Date();
    project.metadata.complexity = this.calculateProjectComplexity(project.requirements);

    // Notify all teams of requirement update
    for (const teamId of project.teams.keys()) {
      this.websocketService.broadcastToTeam(teamId, 'project_requirement_added', {
        projectId,
        requirement,
        timestamp: new Date()
      });
    }
  }

  async generateProjectInsights(projectId: string): Promise<any> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const teamInsights = await Promise.all(
      Array.from(project.teams.entries()).map(async ([teamId, roles]) => {
        const roleInsights = await Promise.all(
          roles.map(role => this.roleManager.getRoleInsights(role, teamId))
        );

        return {
          teamId,
          roles: roleInsights,
          workflow: await this.teamCoordinator.getWorkflowStatus(teamId)
        };
      })
    );

    return {
      projectId,
      name: project.name,
      type: project.type,
      status: project.status,
      complexity: project.metadata.complexity,
      teams: teamInsights,
      timeline: {
        start: project.metadata.createdAt,
        lastUpdated: project.metadata.lastUpdated,
        duration: Date.now() - new Date(project.metadata.createdAt).getTime()
      }
    };
  }
}