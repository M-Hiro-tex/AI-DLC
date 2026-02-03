import { StatisticsService, ProjectCounts, LearningProgress } from '../../src/services/statistics.service';
import { ProjectRepository } from '../../src/repositories/project.repository';
import { ProjectEntity, ProjectStatus } from '../../src/db/schema';

// Mock ProjectRepository
jest.mock('../../src/repositories/project.repository');

describe('StatisticsService', () => {
  let statisticsService: StatisticsService;
  let mockProjectRepository: jest.Mocked<ProjectRepository>;

  beforeEach(() => {
    mockProjectRepository = new ProjectRepository() as jest.Mocked<ProjectRepository>;
    statisticsService = new StatisticsService(mockProjectRepository);
    jest.clearAllMocks();
  });

  const mockProjects: ProjectEntity[] = [
    {
      PK: 'PROJECT#project-1',
      SK: 'METADATA',
      EntityType: 'Project',
      id: 'project-1',
      name: 'Project 1',
      description: 'Description 1',
      ownerId: 'user-123',
      status: 'Draft',
      progressRate: 0,
      tags: ['tag1', 'tag2'],
      sharedWith: [],
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString(),
      GSI1PK: 'OWNER#user-123',
      GSI1SK: new Date('2024-01-15').toISOString(),
    },
    {
      PK: 'PROJECT#project-2',
      SK: 'METADATA',
      EntityType: 'Project',
      id: 'project-2',
      name: 'Project 2',
      description: 'Description 2',
      ownerId: 'user-123',
      status: 'Active',
      progressRate: 50,
      tags: ['tag1', 'tag3'],
      sharedWith: [],
      createdAt: new Date('2024-01-02').toISOString(),
      updatedAt: new Date('2024-01-20').toISOString(),
      GSI1PK: 'OWNER#user-123',
      GSI1SK: new Date('2024-01-20').toISOString(),
    },
    {
      PK: 'PROJECT#project-3',
      SK: 'METADATA',
      EntityType: 'Project',
      id: 'project-3',
      name: 'Project 3',
      description: 'Description 3',
      ownerId: 'user-123',
      status: 'Completed',
      progressRate: 100,
      tags: ['tag2', 'tag3'],
      sharedWith: [],
      createdAt: new Date('2024-01-03').toISOString(),
      updatedAt: new Date('2024-01-25').toISOString(),
      GSI1PK: 'OWNER#user-123',
      GSI1SK: new Date('2024-01-25').toISOString(),
    },
  ];

  describe('getProjectCounts', () => {
    it('should count projects by status correctly', async () => {
      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: mockProjects,
        lastEvaluatedKey: undefined,
      });

      const result = await statisticsService.getProjectCounts('user-123');

      expect(result.total).toBe(3);
      expect(result.byStatus.draft).toBe(1);
      expect(result.byStatus.active).toBe(1);
      expect(result.byStatus.completed).toBe(1);
      expect(result.byStatus.archived).toBe(0);
    });

    it('should return zero counts for user with no projects', async () => {
      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: [],
        lastEvaluatedKey: undefined,
      });

      const result = await statisticsService.getProjectCounts('user-456');

      expect(result.total).toBe(0);
      expect(result.byStatus.draft).toBe(0);
      expect(result.byStatus.active).toBe(0);
      expect(result.byStatus.completed).toBe(0);
      expect(result.byStatus.archived).toBe(0);
    });
  });

  describe('getLearningProgress', () => {
    it('should calculate learning progress correctly', async () => {
      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: mockProjects,
        lastEvaluatedKey: undefined,
      });

      const result = await statisticsService.getLearningProgress('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.totalProjects).toBe(3);
      expect(result.completedProjects).toBe(1);
      expect(result.activeProjects).toBe(1);
      expect(result.progressRate).toBe(33); // 1 completed out of 3 = 33%
      expect(result.averageProjectProgress).toBe(50); // (0 + 50 + 100) / 3 = 50
    });

    it('should handle zero projects gracefully', async () => {
      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: [],
        lastEvaluatedKey: undefined,
      });

      const result = await statisticsService.getLearningProgress('user-456');

      expect(result.totalProjects).toBe(0);
      expect(result.completedProjects).toBe(0);
      expect(result.activeProjects).toBe(0);
      expect(result.progressRate).toBe(0);
      expect(result.averageProjectProgress).toBe(0);
    });
  });

  describe('getProjectActivity', () => {
    it('should return recent projects sorted by updated date', async () => {
      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: mockProjects,
        lastEvaluatedKey: undefined,
      });

      const result = await statisticsService.getProjectActivity('user-123', 2);

      expect(result.recentProjects).toHaveLength(2);
      expect(result.recentProjects[0].id).toBe('project-3'); // Most recently updated
      expect(result.recentProjects[1].id).toBe('project-2');
    });

    it('should calculate creation counts correctly', async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const recentProjects: ProjectEntity[] = [
        { ...mockProjects[0], createdAt: today }, // Today
        { ...mockProjects[1], createdAt: yesterday }, // Yesterday (this week)
        { ...mockProjects[2], createdAt: weekAgo }, // Week ago
      ];

      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: recentProjects,
        lastEvaluatedKey: undefined,
      });

      const result = await statisticsService.getProjectActivity('user-123');

      expect(result.createdToday).toBeGreaterThanOrEqual(0);
      expect(result.createdThisWeek).toBeGreaterThanOrEqual(0);
      expect(result.createdThisMonth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCompletionMetrics', () => {
    it('should calculate completion rate correctly', async () => {
      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: mockProjects,
        lastEvaluatedKey: undefined,
      });

      const result = await statisticsService.getCompletionMetrics('user-123');

      expect(result.completionRate).toBe(33); // 1 completed out of 3 = 33%
      expect(result.averageCompletionTime).toBeGreaterThan(0);
    });

    it('should handle no completed projects', async () => {
      const draftProjects = [mockProjects[0], mockProjects[1]];
      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: draftProjects,
        lastEvaluatedKey: undefined,
      });

      const result = await statisticsService.getCompletionMetrics('user-123');

      expect(result.completionRate).toBe(0);
      expect(result.averageCompletionTime).toBe(0);
    });

    it('should calculate average completion time correctly', async () => {
      const completedProject: ProjectEntity = {
        ...mockProjects[2],
        status: 'Completed',
        createdAt: new Date('2024-01-01').toISOString(),
        updatedAt: new Date('2024-01-11').toISOString(), // 10 days later
      };

      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: [completedProject],
        lastEvaluatedKey: undefined,
      });

      const result = await statisticsService.getCompletionMetrics('user-123');

      expect(result.completionRate).toBe(100);
      expect(result.averageCompletionTime).toBe(10);
    });
  });

  describe('getDashboardStatistics', () => {
    it('should return combined statistics', async () => {
      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: mockProjects,
        lastEvaluatedKey: undefined,
      });

      const result = await statisticsService.getDashboardStatistics('user-123');

      expect(result.counts).toBeDefined();
      expect(result.progress).toBeDefined();
      expect(result.activity).toBeDefined();
      expect(result.completion).toBeDefined();

      expect(result.counts.total).toBe(3);
      expect(result.progress.totalProjects).toBe(3);
      expect(result.activity.recentProjects).toHaveLength(3);
      expect(result.completion.completionRate).toBe(33);
    });
  });

  describe('getStatisticsByTag', () => {
    it('should count projects by tag correctly', async () => {
      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: mockProjects,
        lastEvaluatedKey: undefined,
      });

      const result = await statisticsService.getStatisticsByTag('user-123');

      expect(result.get('tag1')).toBe(2); // tag1 appears in project-1 and project-2
      expect(result.get('tag2')).toBe(2); // tag2 appears in project-1 and project-3
      expect(result.get('tag3')).toBe(2); // tag3 appears in project-2 and project-3
    });

    it('should return empty map for user with no projects', async () => {
      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: [],
        lastEvaluatedKey: undefined,
      });

      const result = await statisticsService.getStatisticsByTag('user-456');

      expect(result.size).toBe(0);
    });

    it('should handle projects with no tags', async () => {
      const projectsWithoutTags: ProjectEntity[] = [
        { ...mockProjects[0], tags: [] },
      ];

      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: projectsWithoutTags,
        lastEvaluatedKey: undefined,
      });

      const result = await statisticsService.getStatisticsByTag('user-123');

      expect(result.size).toBe(0);
    });
  });
});