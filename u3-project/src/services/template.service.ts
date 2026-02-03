import { Logger } from '@aws-lambda-powertools/logger';
import { TemplateRepository } from '../repositories/template.repository';
import { ProjectService } from './project.service';
import { TemplateEntity, TemplateCategory } from '../db/schema';

const logger = new Logger({ serviceName: 'TemplateService' });

export interface ListTemplatesQuery {
  category?: TemplateCategory;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  tags?: string[];
  limit?: number;
}

export interface InstantiateTemplateInput {
  templateId: string;
  projectName: string;
  projectDescription?: string;
  ownerId: string;
}

export class TemplateService {
  constructor(
    private templateRepository: TemplateRepository,
    private projectService: ProjectService
  ) {}

  /**
   * List available templates with optional filters
   */
  async listTemplates(query?: ListTemplatesQuery): Promise<TemplateEntity[]> {
    logger.info('Listing templates', { query });

    // Get all active templates from repository
    const result = await this.templateRepository.listTemplates({
      limit: query?.limit || 50,
    });

    let templates = result.templates.filter(t => t.isActive);

    // Apply filters
    if (query?.category) {
      templates = templates.filter(t => t.category === query.category);
    }

    if (query?.difficulty) {
      templates = templates.filter(t => t.difficulty === query.difficulty);
    }

    if (query?.tags && query.tags.length > 0) {
      templates = templates.filter(t => 
        query.tags!.some(tag => t.tags.includes(tag))
      );
    }

    logger.info('Templates listed successfully', { count: templates.length });
    return templates;
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string): Promise<TemplateEntity | null> {
    logger.info('Getting template', { templateId });

    const template = await this.templateRepository.getById(templateId);
    
    if (!template) {
      logger.warn('Template not found', { templateId });
      return null;
    }

    if (!template.isActive) {
      logger.warn('Template is not active', { templateId });
      return null;
    }

    logger.info('Template retrieved successfully', { templateId });
    return template;
  }

  /**
   * Instantiate a template to create a new project
   * Business Rule: PR-TEMPLATE-001, PR-TEMPLATE-002
   */
  async instantiateTemplate(input: InstantiateTemplateInput) {
    logger.info('Instantiating template', { 
      templateId: input.templateId, 
      projectName: input.projectName 
    });

    // Get template
    const template = await this.getTemplate(input.templateId);
    if (!template) {
      throw new Error('テンプレートが存在しないか、利用できません');
    }

    // Create project from template
    const project = await this.projectService.createProject({
      name: input.projectName,
      description: input.projectDescription || template.description,
      ownerId: input.ownerId,
      tags: template.tags,
      category: template.category,
      templateId: template.id,
    });

    logger.info('Template instantiated successfully', { 
      templateId: template.id, 
      projectId: project.id 
    });

    // TODO: Create specification and code from template content
    // This would call Specification Domain and Code Generation Domain services
    // For MVP, we just create the project with template metadata
    if (template.content.specification) {
      logger.info('Template has specification content - integration pending', {
        projectId: project.id,
        templateId: template.id,
      });
      // Future: await specificationService.createFromTemplate(project.id, template.content.specification);
    }

    if (template.content.codeHints) {
      logger.info('Template has code hints - integration pending', {
        projectId: project.id,
        templateId: template.id,
      });
      // Future: await codeGenerationService.createFromTemplate(project.id, template.content.codeHints);
    }

    return {
      project,
      template,
    };
  }

  /**
   * Get popular templates (most used)
   * Future enhancement: track usage count
   */
  async getPopularTemplates(limit: number = 10): Promise<TemplateEntity[]> {
    logger.info('Getting popular templates', { limit });

    // For MVP, just return all templates sorted by category and name
    const result = await this.templateRepository.listTemplates({ limit });
    const templates = result.templates.filter(t => t.isActive);

    logger.info('Popular templates retrieved', { count: templates.length });
    return templates.slice(0, limit);
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: TemplateCategory): Promise<TemplateEntity[]> {
    logger.info('Getting templates by category', { category });

    return this.listTemplates({ category });
  }

  /**
   * Get beginner-friendly templates
   */
  async getBeginnerTemplates(): Promise<TemplateEntity[]> {
    logger.info('Getting beginner templates');

    return this.listTemplates({ difficulty: 'Beginner' });
  }
}