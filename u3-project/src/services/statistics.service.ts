import { Logger } from '@aws-lambda-powertools/logger';
import { ProjectRepository } from '../repositories/project.repository';
import { Project, projectEntityToProject } from '../db/schema';

const logger = new Logger({ serviceName: 'StatisticsService' });

export interface ProjectCounts {
  total: number;
  byStatus: {
    draft: number;
    active: number;
    completed: number;
    archived: number;
  };
}

export interface LearningProgress {
  userId: string;
  totalProjects: number;
  completedProjects: number;
  activeProjects: number;
  progressRate: number; // Percentage
  averageProjectProgress: number; // Average progressRate across all projects
}

export interface ProjectActivity {
  recentProjects: Project[];
  createdToday: number;
  createdThisWeek: number;
  createdThisMonth: number;
}

export class StatisticsService {
  constructor(private projectRepository: ProjectRepository) {}

  /**
   * Get project counts for a user
   * Business Rule: PR-STATS-001
   */
  async getProjectCounts(userId: string): Promise<ProjectCounts> {
    logger.info('Getting project counts', { userId });

    const result = await this.projectRepository.listByOwner({
      ownerId: userId,
      includeDeleted: false,
      limit: 100, // MVP: Process up to 100 projects
    });

    const projects = result.projects.map(projectEntityToProject);

    const counts: ProjectCounts = {
      total: projects.length,
      byStatus: {
        draft: projects.filter(p => p.status === 'Draft').length,
        active: projects.filter(p => p.status === 'Active').length,
        completed: projects.filter(p => p.status === 'Completed').length,
        archived: projects.filter(p => p.status === 'Archived').length,
      },
    };

    logger.info('Project counts calculated', { userId, counts });
    return counts;
  }

  /**
   * Calculate learning progress for a user
   * Business Rule: PR-PROGRESS-001 (Simplified for MVP)
   */
  async getLearningProgress(userId: string): Promise<LearningProgress> {
    logger.info('Calculating learning progress', { userId });

    const result = await this.projectRepository.listByOwner({
      ownerId: userId,
      includeDeleted: false,
      limit: 100, // MVP: Process up to 100 projects
    });

    const projects = result.projects.map(projectEntityToProject);

    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => p.status === 'Completed').length;
    const activeProjects = projects.filter(p => p.status === 'Active').length;

    // Calculate overall progress rate (completed / total)
    const progressRate = totalProjects > 0
      ? Math.round((completedProjects / totalProjects) * 100)
      : 0;

    // Calculate average progress across all projects
    const totalProgress = projects.reduce((sum, p) => sum + p.progressRate, 0);
    const averageProjectProgress = totalProjects > 0
      ? Math.round(totalProgress / totalProjects)
      : 0;

    const progress: LearningProgress = {
      userId,
      totalProjects,
      completedProjects,
      activeProjects,
      progressRate,
      averageProjectProgress,
    };

    logger.info('Learning progress calculated', { userId, progress });
    return progress;
  }

  /**
   * Get recent project activity
   */
  async getProjectActivity(userId: string, recentCount: number = 10): Promise<ProjectActivity> {
    logger.info('Getting project activity', { userId, recentCount });

    const result = await this.projectRepository.listByOwner({
      ownerId: userId,
      includeDeleted: false,
      limit: 100, // MVP: Process up to 100 projects
    });

    const projects = result.projects.map(projectEntityToProject);

    // Sort by updated date (most recent first)
    const sortedProjects = projects.sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );

    const recentProjects = sortedProjects.slice(0, recentCount);

    // Calculate creation counts
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const createdToday = projects.filter(p => p.createdAt >= today).length;
    const createdThisWeek = projects.filter(p => p.createdAt >= weekAgo).length;
    const createdThisMonth = projects.filter(p => p.createdAt >= monthAgo).length;

    const activity: ProjectActivity = {
      recentProjects,
      createdToday,
      createdThisWeek,
      createdThisMonth,
    };

    logger.info('Project activity calculated', { 
      userId, 
      recentCount: recentProjects.length,
      createdToday,
      createdThisWeek,
      createdThisMonth,
    });

    return activity;
  }

  /**
   * Get completion metrics for a user
   */
  async getCompletionMetrics(userId: string): Promise<{
    completionRate: number;
    averageCompletionTime: number; // In days
  }> {
    logger.info('Calculating completion metrics', { userId });

    const result = await this.projectRepository.listByOwner({
      ownerId: userId,
      includeDeleted: false,
      limit: 100,
    });

    const projects = result.projects.map(projectEntityToProject);
    const completedProjects = projects.filter(p => p.status === 'Completed');

    // Calculate completion rate
    const completionRate = projects.length > 0
      ? Math.round((completedProjects.length / projects.length) * 100)
      : 0;

    // Calculate average completion time
    let averageCompletionTime = 0;
    if (completedProjects.length > 0) {
      const totalDays = completedProjects.reduce((sum, p) => {
        const days = Math.ceil(
          (p.updatedAt.getTime() - p.createdAt.getTime()) / (24 * 60 * 60 * 1000)
        );
        return sum + days;
      }, 0);
      averageCompletionTime = Math.round(totalDays / completedProjects.length);
    }

    logger.info('Completion metrics calculated', { 
      userId, 
      completionRate, 
      averageCompletionTime 
    });

    return {
      completionRate,
      averageCompletionTime,
    };
  }

  /**
   * Get basic dashboard statistics
   * Combines multiple metrics for dashboard display
   */
  async getDashboardStatistics(userId: string): Promise<{
    counts: ProjectCounts;
    progress: LearningProgress;
    activity: ProjectActivity;
    completion: { completionRate: number; averageCompletionTime: number };
  }> {
    logger.info('Getting dashboard statistics', { userId });

    // Fetch all metrics in parallel for better performance
    const [counts, progress, activity, completion] = await Promise.all([
      this.getProjectCounts(userId),
      this.getLearningProgress(userId),
      this.getProjectActivity(userId, 5), // Top 5 recent projects for dashboard
      this.getCompletionMetrics(userId),
    ]);

    logger.info('Dashboard statistics compiled', { userId });

    return {
      counts,
      progress,
      activity,
      completion,
    };
  }

  /**
   * Get project statistics by tag
   * Useful for understanding user's focus areas
   */
  async getStatisticsByTag(userId: string): Promise<Map<string, number>> {
    logger.info('Getting statistics by tag', { userId });

    const result = await this.projectRepository.listByOwner({
      ownerId: userId,
      includeDeleted: false,
      limit: 100,
    });

    const projects = result.projects.map(projectEntityToProject);
    const tagCounts = new Map<string, number>();

    projects.forEach(project => {
      project.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    logger.info('Statistics by tag calculated', { 
      userId, 
      uniqueTags: tagCounts.size 
    });

    return tagCounts;
  }
}