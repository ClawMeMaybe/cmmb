// Workspace file types
export interface WorkspaceFile {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modifiedAt: string;
}

export interface WorkspaceFileContent {
  content: string;
  path: string;
  modifiedAt: string;
}

// Memory entry types
export type MemoryType = "user" | "feedback" | "project" | "reference";

export interface MemoryEntry {
  name: string;
  path: string;
  type: MemoryType;
  description: string;
  content: string;
  updatedAt: string;
}

export interface MemoryEntryInput {
  name: string;
  type: MemoryType;
  content: string;
  description?: string;
}

export interface MemoryEntryUpdate {
  content: string;
  description?: string;
}

// Rules configuration types
export interface RuleConfig {
  name: string;
  path: string;
  content: string;
  enabled: boolean;
  updatedAt: string;
}

export interface RulesConfig {
  rules: RuleConfig[];
  defaultRulesPath: string;
}

// Backup types (extends Prisma model)
export interface WorkspaceBackupData {
  id: string;
  name: string;
  description: string | null;
  filePath: string;
  size: number;
  createdAt: string;
  createdById: string;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface BackupCreateInput {
  name?: string;
  description?: string;
}

// Workspace directory structure
export interface WorkspaceDirectory {
  name: string;
  path: string;
  subdirectories: WorkspaceDirectory[];
  files: WorkspaceFile[];
}

// Workspace stats
export interface WorkspaceStats {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  memoryEntries: number;
  rulesCount: number;
  backupsCount: number;
}

// Frontmatter parsed content
export interface FrontmatterContent {
  frontmatter: Record<string, string>;
  body: string;
  raw: string;
}
