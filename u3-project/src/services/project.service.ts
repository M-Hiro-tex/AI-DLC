import { Logger } from '@aws-lambda-powertools/logger';
import { ProjectRepository, CreateProjectInput as RepoCreateProjectInput } from '../repositories/project.repository';
import { Project, ProjectStatus, ProjectSearchQuery, PaginatedResult, projectEntityToProject } from '../db/schema';

const logger = new Logger({ serviceName: 'ProjectService' });

export interface CreateProjectInput {
  name: string;
  description?: string;
  ownerId: string;
  tags?: string[];
  category?: string;
  templateId?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  progressRate?: number;
  tags?: string[];
  category?: string;
}

export class ProjectService {
  constructor(private projectRepository: ProjectRepository) {}

  /**
   * Create a new project
   * Business Rules: PR-CREATE-001, PR-CREATE-002, PR-CREATE-003, PR-CREATE-004, PR-CREATE-005
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    logger.info('Creating project', { input });

    // PR-CREATE-002: Name format validation
    this.validateProjectName(input.name);

    // PR-CREATE-003: Description length validation
    if (input.description && input.description.length > 1000) {
      throw new Error('説明は1000文字以下である必要があります');
    }

    // PR-CREATE-004: Tags validation
    if (input.tags) {
      this.validateTags(input.tags);
    }

    // PR-CREATE-001: Name uniqueness check (same owner)
    await this.checkNameUniqueness(input.name, input.ownerId);

    // Create repository input
    const repoInput: RepoCreateProjectInput = {
      name: input.name,
      description: input.description || '',
      ownerId: input.ownerId,
      tags: input.tags,
      templateId: input.templateId,
    };

    const createdEntity = await this.projectRepository.create(repoInput);
    const project = projectEntityToProject(createdEntity);
    
    logger.info('Project created successfully', { projectId: project.id });

    // TODO: If templateId provided, instantiate template content (call Specification and Code domains)
    if (input.templateId) {
      logger.info('Template instantiation not yet implemented', { templateId: input.templateId });
    }

    return project;
  }

  /**
   * Update an existing project
   * Business Rules: PR-UPDATE-001, PR-UPDATE-002, PR-UPDATE-003, PR-UPDATE-004, PR-UPDATE-005
   */
  async updateProject(
    projectId: string,
    currentUserId: string,
    input: UpdateProjectInput
  ): Promise<Project> {
    logger.info('Updating project', { projectId, currentUserId, input });

    // Get existing project
    const projectEntity = await this.projectRepository.getById(projectId);
    if (!projectEntity) {
      throw new Error('プロジェクトが見つかりません');
    }

    // PR-UPDATE-005: Shared users cannot modify
    if (projectEntity.ownerId !== currentUserId) {
      throw new Error('このプロジェクトを編集する権限がありません');
    }

    // PR-UPDATE-001: Name update validation
    if (input.name !== undefined) {
      this.validateProjectName(input.name);
      if (input.name !== projectEntity.name) {
        await this.checkNameUniqueness(input.name, projectEntity.ownerId, projectId);
      }
    }

    // Description validation
    if (input.description !== undefined && input.description.length > 1000) {
      throw new Error('説明は1000文字以下である必要があります');
    }

    // Tags validation
    if (input.tags !== undefined) {
      this.validateTags(input.tags);
    }

    // PR-UPDATE-002: Status transition validation
    const project = projectEntityToProject(projectEntity);
    if (input.status !== undefined && input.status !== project.status) {
      await this.validateStatusTransition(project, input.status);
    }

    // Update repository
    const updatedEntity = await this.projectRepository.update(projectId, input);
    const updatedProject = projectEntityToProject(updatedEntity);
    
    logger.info('Project updated successfully', { projectId });

    return updatedProject;
  }

  /**
   * Delete a project (soft delete)
   * Business Rules: PR-DELETE-001, PR-DELETE-002
   */
  async deleteProject(projectId: string, currentUserId: string): Promise<void> {
    logger.info('Deleting project', { projectId, currentUserId });

    const projectEntity = await this.projectRepository.getById(projectId);
    if (!projectEntity) {
      throw new Error('プロジェクトが見つかりません');
    }

    // PR-DELETE-001: Owner-only deletion
    if (projectEntity.ownerId !== currentUserId) {
      throw new Error('このプロジェクトを削除する権限がありません');
    }

    // PR-DELETE-002: Soft delete execution
    await this.projectRepository.delete(projectId);
    logger.info('Project soft deleted successfully', { projectId });
  }

  /**
   * Restore a soft-deleted project
   */
  async restoreProject(projectId: string, currentUserId: string): Promise<Project> {
    logger.info('Restoring project', { projectId, currentUserId });

    const projectEntity = await this.projectRepository.getById(projectId);
    if (!projectEntity) {
      throw new Error('プロジェクトが見つかりません');
    }

    if (projectEntity.ownerId !== currentUserId) {
      throw new Error('このプロジェクトを復元する権限がありません');
    }

    if (!projectEntity.deletedAt) {
      throw new Error('このプロジェクトは削除されていません');
    }

    const restoredEntity = await this.projectRepository.restore(projectId);
    const restoredProject = projectEntityToProject(restoredEntity);
    
    logger.info('Project restored successfully', { projectId });

    return restoredProject;
  }

  /**
   * Get a single project by ID
   * Business Rules: PR-QUERY-001, PR-QUERY-002
   */
  async getProject(projectId: string, currentUserId: string): Promise<Project | null> {
    logger.info('Getting project', { projectId, currentUserId });

    const projectEntity = await this.projectRepository.getById(projectId);
    if (!projectEntity) {
      return null;
    }

    // PR-QUERY-002: Owner-based filtering
    if (projectEntity.ownerId !== currentUserId && !projectEntity.sharedWith.includes(currentUserId)) {
      throw new Error('このプロジェクトにアクセスする権限がありません');
    }

    return projectEntityToProject(projectEntity);
  }

  /**
   * List projects for a user
   * Business Rules: PR-QUERY-001, PR-QUERY-002, PR-QUERY-004
   */
  async listProjects(
    currentUserId: string,
    query?: ProjectSearchQuery
  ): Promise<PaginatedResult<Project>> {
    logger.info('Listing projects', { currentUserId, query });

    // PR-QUERY-004: Pagination limits
    const sanitizedQuery = this.sanitizeSearchQuery(query);

    // Get projects from repository
    const result = await this.projectRepository.listByOwner({
      ownerId: currentUserId,
      includeDeleted: false,
      limit: sanitizedQuery.pageSize,
    });

    // Convert entities to domain models
    let projects = result.projects.map(projectEntityToProject);

    // Apply filters (name search, tags, category)
    if (sanitizedQuery.nameQuery) {
      const nameQuery = sanitizedQuery.nameQuery.toLowerCase();
      projects = projects.filter(p => p.name.toLowerCase().includes(nameQuery));
    }

    if (sanitizedQuery.tags && sanitizedQuery.tags.length > 0) {
      projects = projects.filter(p => 
        sanitizedQuery.tags!.every(tag => p.tags.includes(tag))
      );
    }

    if (sanitizedQuery.category) {
      projects = projects.filter(p => p.category === sanitizedQuery.category);
    }

    // Apply sorting
    projects = this.sortProjects(projects, sanitizedQuery.sortBy, sanitizedQuery.sortOrder);

    // Apply pagination
    const totalCount = projects.length;
    const totalPages = Math.ceil(totalCount / sanitizedQuery.pageSize);
    const startIndex = (sanitizedQuery.page - 1) * sanitizedQuery.pageSize;
    const endIndex = startIndex + sanitizedQuery.pageSize;
    const paginatedItems = projects.slice(startIndex, endIndex);

    logger.info('Projects listed successfully', { 
      currentUserId, 
      count: paginatedItems.length,
      totalCount 
    });

    return {
      items: paginatedItems,
      totalCount,
      page: sanitizedQuery.page,
      pageSize: sanitizedQuery.pageSize,
      totalPages,
      hasNext: sanitizedQuery.page < totalPages,
      hasPrevious: sanitizedQuery.page > 1,
    };
  }

  /**
   * Share a project with other users
   * Business Rules: PR-SHARE-001, PR-SHARE-002, PR-SHARE-003, PR-SHARE-004
   */
  async shareProject(
    projectId: string,
    currentUserId: string,
    shareWithUserIds: string[]
  ): Promise<Project> {
    logger.info('Sharing project', { projectId, currentUserId, shareWithUserIds });

    const projectEntity = await this.projectRepository.getById(projectId);
    if (!projectEntity) {
      throw new Error('プロジェクトが見つかりません');
    }

    // PR-SHARE-001: Owner-only sharing management
    if (projectEntity.ownerId !== currentUserId) {
      throw new Error('このプロジェクトの共有設定を変更する権限がありません');
    }

    // PR-SHARE-003: Self-sharing prevention
    const filteredUserIds = shareWithUserIds.filter(id => id !== projectEntity.ownerId);

    // TODO: PR-SHARE-002: User existence validation (requires User domain integration)
    // For now, assume all user IDs are valid

    const updatedEntity = await this.projectRepository.share(projectId, filteredUserIds);
    const updatedProject = projectEntityToProject(updatedEntity);

    logger.info('Project shared successfully', { projectId, sharedWith: filteredUserIds });

    return updatedProject;
  }

  // Private helper methods

  /**
   * Validate project name format
   * Business Rule: PR-CREATE-002
   */
  private validateProjectName(name: string): void {
    if (name.length < 3) {
      throw new Error('プロジェクト名は3文字以上である必要があります');
    }
    if (name.length > 100) {
      throw new Error('プロジェクト名は100文字以下である必要があります');
    }
    const nameRegex = /^[a-zA-Z0-9 _-]{3,100}$/;
    if (!nameRegex.test(name)) {
      throw new Error('プロジェクト名には英数字、スペース、ハイフン、アンダースコアのみ使用できます');
    }
  }

  /**
   * Validate tags
   * Business Rule: PR-CREATE-004
   */
  private validateTags(tags: string[]): void {
    if (tags.length > 10) {
      throw new Error('タグは最大10個までです');
    }
    for (const tag of tags) {
      if (tag.length === 0 || tag.length > 20) {
        throw new Error('各タグは1-20文字である必要があります');
      }
    }
  }

  /**
   * Check name uniqueness within same owner
   * Business Rule: PR-CREATE-001, PR-UPDATE-001
   */
  private async checkNameUniqueness(
    name: string,
    ownerId: string,
    excludeProjectId?: string
  ): Promise<void> {
    const result = await this.projectRepository.listByOwner({
      ownerId,
      includeDeleted: false,
      limit: 100, // Check recent projects
    });

    const duplicates = result.projects.filter(
      p => p.name === name && (!excludeProjectId || p.id !== excludeProjectId)
    );

    if (duplicates.length > 0) {
      throw new Error('このプロジェクト名は既に使用されています。別の名前を選択してください。');
    }
  }

  /**
   * Validate status transition
   * Business Rule: PR-UPDATE-002
   */
  private async validateStatusTransition(
    project: Project,
    newStatus: ProjectStatus
  ): Promise<void> {
    // Draft → Active: Always allowed
    if (project.status === 'Draft' && newStatus === 'Active') {
      return;
    }

    // Active → Completed: Requires specification and code
    if (project.status === 'Active' && newStatus === 'Completed') {
      if (project.specificationIds.length === 0) {
        throw new Error('プロジェクトを完了するには、少なくとも1つの仕様が必要です');
      }
      if (project.generatedCodeIds.length === 0) {
        throw new Error('プロジェクトを完了するには、少なくとも1つのコード生成が必要です');
      }
      return;
    }

    // Draft → Completed: Requires specification and code
    if (project.status === 'Draft' && newStatus === 'Completed') {
      if (project.specificationIds.length === 0 || project.generatedCodeIds.length === 0) {
        throw new Error('プロジェクトを完了するには、仕様とコード生成が必要です');
      }
      return;
    }

    // Completed → Draft/Active: Always allowed (re-open)
    if (project.status === 'Completed' && (newStatus === 'Draft' || newStatus === 'Active')) {
      return;
    }

    // Any other transition is allowed (flexible model)
    return;
  }

  /**
   * Sanitize search query
   * Business Rules: PR-QUERY-003, PR-QUERY-004
   */
  private sanitizeSearchQuery(query?: ProjectSearchQuery): ProjectSearchQuery {
    const defaultQuery: ProjectSearchQuery = {
      page: 1,
      pageSize: 20,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    };

    if (!query) {
      return defaultQuery;
    }

    // PR-QUERY-004: Pagination limits
    let pageSize = query.pageSize || 20;
    if (pageSize < 1) pageSize = 1;
    if (pageSize > 100) pageSize = 100;

    return {
      nameQuery: query.nameQuery,
      tags: query.tags,
      category: query.category,
      sortBy: query.sortBy || 'updatedAt',
      sortOrder: query.sortOrder || 'desc',
      page: query.page || 1,
      pageSize,
    };
  }

  /**
   * Sort projects by specified field and order
   */
  private sortProjects(
    projects: Project[],
    sortBy: 'updatedAt' | 'createdAt' | 'name' | 'status',
    sortOrder: 'asc' | 'desc'
  ): Project[] {
    const sorted = [...projects].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          // Custom order: Active → Draft → Completed → Archived
          const statusOrder = { Active: 1, Draft: 2, Completed: 3, Archived: 4 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }
}