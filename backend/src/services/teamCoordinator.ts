import { RoleManager } from './roleManager';
import { MemoryService } from './memoryService';
import { PromptService } from './promptService';
import { WebSocketService } from './websocketService';
import { logger } from '../utils/logger';

interface TaskDefinition {
  id: string;
  projectId: string;
  description: string;
  assignedRoles: string[];
  dependencies: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority: number;
  metadata: any;
}

interface TeamWorkflow {
  projectId: string;
  tasks: TaskDefinition[];
  roleAssignments: Map<string, string[]>;
  taskDependencies: Map<string, string[]>;
  progress: Map<string, number>;
}

export class TeamCoordinator {
  private static instance: TeamCoordinator;
  private roleManager: RoleManager;
  private memoryService: MemoryService;
  private promptService: PromptService;
  private websocketService: WebSocketService;
  private workflows: Map<string, TeamWorkflow>;

  private constructor() {
    this.roleManager = RoleManager.getInstance();
    this.memoryService = MemoryService.getInstance();
    this.promptService = PromptService.getInstance();
    this.websocketService = WebSocketService.getInstance();
    this.workflows = new Map();
  }

  static getInstance(): TeamCoordinator {
    if (!TeamCoordinator.instance) {
      TeamCoordinator.instance = new TeamCoordinator();
    }
    return TeamCoordinator.instance;
  }

  async initializeTeamWorkflow(projectId: string, requirements: string) {
    try {
      // Analyze requirements and identify relevant roles
      const relevantRoles = await this.roleManager.getRelevantRoles(projectId, requirements);

      // Break down requirements into tasks
      const tasks = await this.breakdownRequirements(requirements, relevantRoles);

      // Create workflow
      const workflow: TeamWorkflow = {
        projectId,
        tasks,
        roleAssignments: new Map(),
        taskDependencies: new Map(),
        progress: new Map()
      };

      // Assign roles to tasks based on expertise
      await this.assignRolesToTasks(workflow);

      // Initialize task dependencies
      await this.initializeTaskDependencies(workflow);

      this.workflows.set(projectId, workflow);
      
      // Notify team members
      this.websocketService.broadcastToTeam(projectId, 'workflow_initialized', {
        tasks: workflow.tasks,
        roleAssignments: Array.from(workflow.roleAssignments.entries())
      });

      return workflow;
    } catch (error) {
      logger.error('Error initializing team workflow:', error);
      throw error;
    }
  }

  private async breakdownRequirements(requirements: string, roles: string[]): Promise<TaskDefinition[]> {
    const tasks: TaskDefinition[] = [];
    let taskId = 1;

    try {
      const prompt = await this.promptService.generatePrompt('manager', 'plan', {
        message: requirements,
        roles
      });

      const response = await this.promptService.generateChainedPrompt(roles, prompt, {
        projectType: 'software',
        requirements
      });

      // Parse and structure tasks from the response
      const taskBreakdown = JSON.parse(response);
      
      for (const task of taskBreakdown) {
        tasks.push({
          id: `task-${taskId++}`,
          projectId: requirements,
          description: task.description,
          assignedRoles: [],
          dependencies: task.dependencies || [],
          status: 'pending',
          priority: task.priority || 1,
          metadata: task.metadata || {}
        });
      }

      return tasks;
    } catch (error) {
      logger.error('Error breaking down requirements:', error);
      throw error;
    }
  }

  private async assignRolesToTasks(workflow: TeamWorkflow) {
    for (const task of workflow.tasks) {
      const relevantRoles = await this.roleManager.getRelevantRoles(
        workflow.projectId,
        task.description
      );

      task.assignedRoles = relevantRoles;
      
      // Update role assignments
      for (const role of relevantRoles) {
        const currentTasks = workflow.roleAssignments.get(role) || [];
        workflow.roleAssignments.set(role, [...currentTasks, task.id]);
      }
    }
  }

  private async initializeTaskDependencies(workflow: TeamWorkflow) {
    for (const task of workflow.tasks) {
      if (task.dependencies.length > 0) {
        workflow.taskDependencies.set(task.id, task.dependencies);
      }
      workflow.progress.set(task.id, 0);
    }
  }

  async processTeamTask(projectId: string, taskId: string, message: string) {
    try {
      const workflow = this.workflows.get(projectId);
      if (!workflow) {
        throw new Error(`No workflow found for project ${projectId}`);
      }

      const task = workflow.tasks.find(t => t.id === taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found in project ${projectId}`);
      }

      // Check if task dependencies are met
      if (!this.areTaskDependenciesMet(workflow, task)) {
        throw new Error(`Task ${taskId} has unmet dependencies`);
      }

      // Process task with assigned roles
      const responses = await Promise.all(
        task.assignedRoles.map(async role => {
          const prompt = await this.promptService.generatePrompt(role, 'process', {
            task: task.description,
            message,
            context: await this.memoryService.getRelevantContext(projectId, role)
          });

          return {
            role,
            response: prompt
          };
        })
      );

      // Update task status and progress
      task.status = 'in-progress';
      workflow.progress.set(task.id, 50); // Example progress update

      // Store responses in memory
      await Promise.all(
        responses.map(({ role, response }) =>
          this.memoryService.addToMemory(projectId, {
            role,
            content: response,
            timestamp: new Date(),
            metadata: { taskId }
          })
        )
      );

      // Notify team members of progress
      this.websocketService.broadcastToTeam(projectId, 'task_progress', {
        taskId,
        status: task.status,
        progress: workflow.progress.get(task.id),
        responses
      });

      return responses;
    } catch (error) {
      logger.error('Error processing team task:', error);
      throw error;
    }
  }

  private areTaskDependenciesMet(workflow: TeamWorkflow, task: TaskDefinition): boolean {
    const dependencies = workflow.taskDependencies.get(task.id) || [];
    return dependencies.every(depId => {
      const depTask = workflow.tasks.find(t => t.id === depId);
      return depTask && depTask.status === 'completed';
    });
  }

  async updateTaskStatus(projectId: string, taskId: string, status: TaskDefinition['status']) {
    const workflow = this.workflows.get(projectId);
    if (!workflow) {
      throw new Error(`No workflow found for project ${projectId}`);
    }

    const task = workflow.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = status;
    if (status === 'completed') {
      workflow.progress.set(taskId, 100);
    }

    // Notify team members
    this.websocketService.broadcastToTeam(projectId, 'task_status_update', {
      taskId,
      status,
      progress: workflow.progress.get(taskId)
    });
  }

  async getWorkflowStatus(projectId: string) {
    const workflow = this.workflows.get(projectId);
    if (!workflow) {
      throw new Error(`No workflow found for project ${projectId}`);
    }

    const taskStatus = workflow.tasks.map(task => ({
      id: task.id,
      description: task.description,
      status: task.status,
      progress: workflow.progress.get(task.id),
      assignedRoles: task.assignedRoles
    }));

    const overallProgress = Array.from(workflow.progress.values())
      .reduce((sum, progress) => sum + progress, 0) / workflow.tasks.length;

    return {
      projectId,
      tasks: taskStatus,
      overallProgress,
      roleAssignments: Array.from(workflow.roleAssignments.entries())
    };
  }

  async reassignTask(projectId: string, taskId: string, newRoles: string[]) {
    const workflow = this.workflows.get(projectId);
    if (!workflow) {
      throw new Error(`No workflow found for project ${projectId}`);
    }

    const task = workflow.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Update role assignments
    task.assignedRoles = newRoles;
    
    // Update workflow role assignments
    for (const [role, tasks] of workflow.roleAssignments.entries()) {
      if (newRoles.includes(role)) {
        if (!tasks.includes(taskId)) {
          tasks.push(taskId);
        }
      } else {
        const index = tasks.indexOf(taskId);
        if (index > -1) {
          tasks.splice(index, 1);
        }
      }
    }

    // Notify team members
    this.websocketService.broadcastToTeam(projectId, 'task_reassigned', {
      taskId,
      newRoles,
      roleAssignments: Array.from(workflow.roleAssignments.entries())
    });
  }
}