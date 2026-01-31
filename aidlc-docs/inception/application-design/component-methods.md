# Component Methods

## Overview

本ドキュメントでは、各コンポーネントの主要メソッドのシグネチャと目的を定義します。

**Note**: 詳細なビジネスルールとロジックは、Functional Design（CONSTRUCTION phase、per-unit）で定義されます。

---

## Frontend Components

### 1. Authentication Component

#### AuthenticationUI
```typescript
interface AuthenticationUI {
  renderLoginScreen(): void
  handleGoogleLogin(): Promise<AuthResponse>
  handleGitHubLogin(): Promise<AuthResponse>
  displayAuthError(error: AuthError): void
}
```

#### SessionManager
```typescript
interface SessionManager {
  initializeSession(token: string): void
  getSessionStatus(): SessionStatus
  refreshSession(): Promise<void>
  terminateSession(): void
}
```

---

### 2. Project Management Component

#### ProjectListView
```typescript
interface ProjectListView {
  fetchProjects(): Promise<Project[]>
  displayProjects(projects: Project[]): void
  filterProjects(criteria: FilterCriteria): Project[]
  sortProjects(sortBy: SortOption): void
}
```

#### ProjectCreationForm
```typescript
interface ProjectCreationForm {
  renderForm(): void
  validateInput(formData: ProjectFormData): ValidationResult
  submitProject(projectData: ProjectData): Promise<Project>
  handleCreationError(error: Error): void
}
```

#### ProjectManager
```typescript
interface ProjectManager {
  createProject(data: ProjectData): Promise<Project>
  deleteProject(projectId: string): Promise<void>
  updateProject(projectId: string, data: Partial<ProjectData>): Promise<Project>
  getProjectDetails(projectId: string): Promise<ProjectDetail>
}
```

---

### 3. Specification Editor Component

#### EditorUI
```typescript
interface EditorUI {
  initializeEditor(config: EditorConfig): void
  loadSpecification(specId: string): Promise<void>
  getEditorContent(): string
  setEditorContent(content: string): void
  applySyntaxHighlighting(): void
  handleEditorChange(callback: (content: string) => void): void
}
```

#### ValidationDisplay
```typescript
interface ValidationDisplay {
  showValidationResults(results: ValidationResult[]): void
  highlightIssues(issues: Issue[]): void
  clearValidation(): void
  updateRealtime(result: ValidationResult): void
}
```

#### EditorStateManager
```typescript
interface EditorStateManager {
  saveState(): void
  restoreState(): EditorState
  markDirty(): void
  markClean(): void
  isDirty(): boolean
}
```

---

### 4. Code Preview Component

#### CodeViewer
```typescript
interface CodeViewer {
  displayGeneratedCode(code: GeneratedCode): void
  applySyntaxHighlighting(language: string): void
  switchFile(filePath: string): void
  copyToClipboard(): void
}
```

#### FileTreeView
```typescript
interface FileTreeView {
  renderFileTree(structure: FileStructure): void
  expandNode(nodeId: string): void
  collapseNode(nodeId: string): void
  selectFile(filePath: string): void
}
```

#### DownloadHandler
```typescript
interface DownloadHandler {
  downloadAsZip(): void
  downloadSingleFile(filePath: string): void
  prepareDownload(files: File[]): Blob
}
```

---

### 5. Validation Viewer Component

#### ValidationResultView
```typescript
interface ValidationResultView {
  displayResults(results: ValidationResult[]): void
  filterByType(type: ValidationType): ValidationResult[]
  sortBySeverity(): void
  showDetail(resultId: string): void
}
```

#### IssueHighlighter
```typescript
interface IssueHighlighter {
  highlightIssue(issue: Issue, target: Element): void
  clearHighlights(): void
  scrollToIssue(issueId: string): void
}
```

---

### 6. Tutorial Component

#### TutorialWizard
```typescript
interface TutorialWizard {
  startTutorial(): void
  nextStep(): void
  previousStep(): void
  skipTutorial(): void
  completeTutorial(): void
  getCurrentStep(): TutorialStep
}
```

#### ContextHelp
```typescript
interface ContextHelp {
  showHelp(context: string): void
  hideHelp(): void
  searchHelp(query: string): HelpResult[]
}
```

#### SampleProjectLoader
```typescript
interface SampleProjectLoader {
  listSamples(): Sample[]
  loadSample(sampleId: string): Promise<Project>
  applySample(sampleId: string): Promise<void>
}
```

---

### 7. UI Shell Component

#### AppShell
```typescript
interface AppShell {
  renderLayout(): void
  toggleSidebar(): void
  updateBreadcrumb(path: string[]): void
  showNotification(message: Notification): void
}
```

#### RouteManager
```typescript
interface RouteManager {
  navigateTo(route: string): void
  getCurrentRoute(): string
  registerRoute(path: string, component: Component): void
  goBack(): void
}
```

---

## Backend Components (BFF Layer)

### 8. Authentication Service Component

#### AuthenticationService
```typescript
interface AuthenticationService {
  authenticateWithGoogle(token: string): Promise<UserSession>
  authenticateWithGitHub(code: string): Promise<UserSession>
  validateSession(sessionToken: string): Promise<SessionStatus>
  refreshToken(refreshToken: string): Promise<TokenPair>
  logout(sessionToken: string): Promise<void>
}
```

#### UserProfileService
```typescript
interface UserProfileService {
  createProfile(userData: UserData): Promise<UserProfile>
  getProfile(userId: string): Promise<UserProfile>
  updateProfile(userId: string, data: Partial<UserData>): Promise<UserProfile>
  deleteProfile(userId: string): Promise<void>
}
```

---

### 9. Project Service Component

#### ProjectService
```typescript
interface ProjectService {
  createProject(userId: string, data: ProjectData): Promise<Project>
  getProject(projectId: string): Promise<Project>
  updateProject(projectId: string, data: Partial<ProjectData>): Promise<Project>
  deleteProject(projectId: string): Promise<void>
  listUserProjects(userId: string, filter: FilterCriteria): Promise<Project[]>
}
```

#### ProjectQueryService
```typescript
interface ProjectQueryService {
  searchProjects(query: SearchQuery): Promise<Project[]>
  filterProjects(criteria: FilterCriteria): Promise<Project[]>
  getProjectStats(projectId: string): Promise<ProjectStats>
}
```

---

### 10. Specification Service Component

#### SpecificationService
```typescript
interface SpecificationService {
  createSpecification(projectId: string, content: string): Promise<Specification>
  getSpecification(specId: string): Promise<Specification>
  updateSpecification(specId: string, content: string): Promise<Specification>
  deleteSpecification(specId: string): Promise<void>
  getSpecificationHistory(specId: string): Promise<Version[]>
}
```

#### VersionControlService
```typescript
interface VersionControlService {
  createVersion(specId: string, content: string): Promise<Version>
  getVersion(versionId: string): Promise<Version>
  compareVersions(versionId1: string, versionId2: string): Promise<Diff>
  restoreVersion(specId: string, versionId: string): Promise<Specification>
}
```

---

### 11. Validation Service Component

#### ValidationEngine
```typescript
interface ValidationEngine {
  validate(specification: string): Promise<ValidationResult>
  validateIncremental(specification: string, changes: Change[]): Promise<ValidationResult>
  getValidationRules(): ValidationRule[]
}
```

#### SyntaxValidator
```typescript
interface SyntaxValidator {
  validateSyntax(content: string): SyntaxValidationResult
  parseSyntax(content: string): AST
}
```

#### ConsistencyChecker
```typescript
interface ConsistencyChecker {
  checkConsistency(spec: string, implementation: string): ConsistencyResult
  findDifferences(spec: string, implementation: string): Difference[]
  generateReport(result: ConsistencyResult): Report
}
```

---

### 12. Code Generation Service Component

#### CodeGenerator
```typescript
interface CodeGenerator {
  generateCode(specification: string, options: GenerationOptions): Promise<GeneratedCode>
  generateFromTemplate(template: Template, data: TemplateData): GeneratedCode
  validateGeneratedCode(code: GeneratedCode): ValidationResult
}
```

#### SpecificationParser
```typescript
interface SpecificationParser {
  parse(specification: string): ParsedSpecification
  extractEntities(spec: ParsedSpecification): Entity[]
  extractRelationships(spec: ParsedSpecification): Relationship[]
}
```

#### TemplateEngine
```typescript
interface TemplateEngine {
  loadTemplate(templateId: string): Promise<Template>
  applyTemplate(template: Template, data: any): string
  listAvailableTemplates(): Template[]
}
```

---

### 13. AI Service Component

#### AIService
```typescript
interface AIService {
  generateCodeSuggestion(spec: string): Promise<CodeSuggestion>
  improveSpecification(spec: string): Promise<SpecificationImprovement>
  explainCode(code: string): Promise<Explanation>
  answerQuestion(question: string, context: string): Promise<Answer>
}
```

#### AIProviderAdapter
```typescript
interface AIProviderAdapter {
  sendRequest(prompt: string, options: AIOptions): Promise<AIResponse>
  streamResponse(prompt: string, callback: (chunk: string) => void): Promise<void>
  checkAvailability(): Promise<boolean>
}
```

---

### 14. Data Persistence Service Component

#### DatabaseService
```typescript
interface DatabaseService {
  query(tableName: string, queryParams: QueryParams): Promise<QueryResult>
  insert(tableName: string, item: any): Promise<void>
  update(tableName: string, key: string, updates: any): Promise<void>
  delete(tableName: string, key: string): Promise<void>
  batchOperation(operations: Operation[]): Promise<void>
}
```

#### FileStorageService
```typescript
interface FileStorageService {
  uploadFile(key: string, content: Buffer, metadata: FileMetadata): Promise<string>
  downloadFile(key: string): Promise<Buffer>
  deleteFile(key: string): Promise<void>
  listFiles(prefix: string): Promise<FileInfo[]>
  generatePresignedUrl(key: string, expiresIn: number): Promise<string>
}
```

#### TransactionManager
```typescript
interface TransactionManager {
  beginTransaction(): Promise<Transaction>
  commitTransaction(transaction: Transaction): Promise<void>
  rollbackTransaction(transaction: Transaction): Promise<void>
  executeInTransaction(callback: (tx: Transaction) => Promise<void>): Promise<void>
}
```

---

## Method Naming Conventions

- **Query/Get**: データ取得メソッド（副作用なし）
- **Create**: 新規作成メソッド
- **Update**: 更新メソッド
- **Delete**: 削除メソッド
- **Validate**: 検証メソッド
- **Handle**: イベント処理メソッド
- **Render/Display**: UI表示メソッド

---

## Return Types

すべてのメソッドは適切な型を返します：
- 同期メソッド: 直接値を返す
- 非同期メソッド: `Promise<T>` を返す
- イベントハンドラ: `void` または `Promise<void>`

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-31  
**Status**: Complete