import { promises as fs } from "fs";
import { join, resolve, relative, basename, dirname } from "path";
import { prisma } from "@/lib/prisma";
import type {
  WorkspaceFile,
  WorkspaceFileContent,
  MemoryEntry,
  MemoryType,
  FrontmatterContent,
  WorkspaceDirectory,
  WorkspaceStats,
} from "@/types/workspace";
import type { WorkspaceBackup } from "@prisma/client";

// Base workspace directory - can be configured via env
const WORKSPACE_BASE_DIR =
  process.env.WORKSPACE_DIR || join(process.env.HOME || "/root", ".claw");

/**
 * Validates a path to prevent directory traversal attacks.
 * Returns the safe absolute path or throws an error.
 */
export function validatePath(requestPath: string): string {
  // Normalize the path
  const normalizedPath = requestPath.replace(/^\/+/, "");

  // Check for path traversal attempts
  if (
    normalizedPath.includes("..") ||
    normalizedPath.includes("\\") ||
    normalizedPath.startsWith("/")
  ) {
    throw new Error("Invalid path: directory traversal detected");
  }

  // Build the absolute path
  const absolutePath = resolve(WORKSPACE_BASE_DIR, normalizedPath);

  // Verify it's within the workspace directory
  const relativePath = relative(WORKSPACE_BASE_DIR, absolutePath);
  if (relativePath.startsWith("..") || relativePath.startsWith("/")) {
    throw new Error("Invalid path: outside workspace directory");
  }

  return absolutePath;
}

/**
 * Get the allowed directories for workspace browsing.
 */
export function getWorkspaceBasePath(): string {
  return WORKSPACE_BASE_DIR;
}

/**
 * List files and directories at a given path.
 */
export async function listWorkspaceFiles(
  dirPath: string
): Promise<WorkspaceFile[]> {
  const safePath = validatePath(dirPath || "");

  try {
    const entries = await fs.readdir(safePath, { withFileTypes: true });

    const files: WorkspaceFile[] = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(safePath, entry.name);
        const stats = await fs.stat(fullPath);
        const relativePath = relative(WORKSPACE_BASE_DIR, fullPath);

        return {
          name: entry.name,
          path: relativePath,
          type: entry.isDirectory() ? "directory" : "file",
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        };
      })
    );

    // Sort: directories first, then files alphabetically
    return files.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Read a file's content.
 */
export async function readWorkspaceFile(
  filePath: string
): Promise<WorkspaceFileContent> {
  const safePath = validatePath(filePath);

  try {
    const content = await fs.readFile(safePath, "utf-8");
    const stats = await fs.stat(safePath);
    const relativePath = relative(WORKSPACE_BASE_DIR, safePath);

    return {
      content,
      path: relativePath,
      modifiedAt: stats.mtime.toISOString(),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("File not found");
    }
    throw error;
  }
}

/**
 * Write content to a file. Creates the file if it doesn't exist.
 */
export async function writeWorkspaceFile(
  filePath: string,
  content: string
): Promise<WorkspaceFileContent> {
  const safePath = validatePath(filePath);

  // Ensure the parent directory exists
  const parentDir = dirname(safePath);
  await fs.mkdir(parentDir, { recursive: true });

  await fs.writeFile(safePath, content, "utf-8");
  const stats = await fs.stat(safePath);
  const relativePath = relative(WORKSPACE_BASE_DIR, safePath);

  return {
    content,
    path: relativePath,
    modifiedAt: stats.mtime.toISOString(),
  };
}

/**
 * Delete a file. Throws if the file doesn't exist or is a directory.
 */
export async function deleteWorkspaceFile(filePath: string): Promise<boolean> {
  const safePath = validatePath(filePath);

  try {
    const stats = await fs.stat(safePath);

    if (stats.isDirectory()) {
      throw new Error("Cannot delete directory");
    }

    await fs.unlink(safePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("File not found");
    }
    throw error;
  }
}

/**
 * Parse frontmatter from a markdown file.
 */
export function parseFrontmatter(content: string): FrontmatterContent {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  const frontmatter: Record<string, string> = {};
  let body = content;

  if (frontmatterMatch) {
    const frontmatterText = frontmatterMatch[1];
    body = frontmatterMatch[2];

    // Parse YAML frontmatter
    const lines = frontmatterText.split("\n");
    for (const line of lines) {
      const keyValueMatch = line.match(/^(\w+):\s*(.*)$/);
      if (keyValueMatch) {
        const [, key, value] = keyValueMatch;
        frontmatter[key] = value;
      }
    }
  }

  return {
    frontmatter,
    body: body.trim(),
    raw: content,
  };
}

/**
 * Determine memory type from path.
 */
function getMemoryTypeFromPath(path: string): MemoryType {
  if (path.includes("memory/user") || path.includes("memory/users")) {
    return "user";
  }
  if (path.includes("memory/feedback")) {
    return "feedback";
  }
  if (path.includes("memory/project")) {
    return "project";
  }
  if (path.includes("memory/reference")) {
    return "reference";
  }
  // Default based on file name or location
  return "project";
}

/**
 * List all memory entries in the memory directory.
 */
export async function listMemoryEntries(): Promise<MemoryEntry[]> {
  const memoryDir = join(WORKSPACE_BASE_DIR, "memory");

  try {
    const entries: MemoryEntry[] = [];
    const subdirs = await fs.readdir(memoryDir, { withFileTypes: true });

    for (const subdir of subdirs) {
      if (!subdir.isDirectory()) continue;

      const subdirPath = join(memoryDir, subdir.name);
      const files = await fs.readdir(subdirPath, { withFileTypes: true });

      for (const file of files) {
        if (!file.isFile() || !file.name.endsWith(".md")) continue;

        const filePath = join(subdirPath, file.name);
        const content = await fs.readFile(filePath, "utf-8");
        const stats = await fs.stat(filePath);
        const relativePath = relative(WORKSPACE_BASE_DIR, filePath);

        const parsed = parseFrontmatter(content);
        const type = getMemoryTypeFromPath(relativePath);

        entries.push({
          name: parsed.frontmatter.name || basename(file.name, ".md"),
          path: relativePath,
          type,
          description: parsed.frontmatter.description || "",
          content: parsed.body,
          updatedAt: stats.mtime.toISOString(),
        });
      }
    }

    return entries.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Get a single memory entry by name.
 */
export async function getMemoryEntry(
  name: string
): Promise<MemoryEntry | null> {
  const entries = await listMemoryEntries();
  return entries.find((entry) => entry.name === name) || null;
}

/**
 * Create a new memory entry.
 */
export async function createMemoryEntry(data: {
  name: string;
  type: MemoryType;
  content: string;
  description?: string;
}): Promise<MemoryEntry> {
  // Validate name
  if (
    data.name.includes("..") ||
    data.name.includes("/") ||
    data.name.includes("\\")
  ) {
    throw new Error("Invalid memory name");
  }

  // Determine directory based on type
  const typeDir = join(WORKSPACE_BASE_DIR, "memory", data.type);
  await fs.mkdir(typeDir, { recursive: true });

  const fileName = `${data.name}.md`;
  const filePath = join(typeDir, fileName);

  // Build frontmatter
  const frontmatterLines = ["---", `name: ${data.name}`, `type: ${data.type}`];
  if (data.description) {
    frontmatterLines.push(`description: ${data.description}`);
  }
  frontmatterLines.push("---", "");

  const fullContent = frontmatterLines.join("\n") + data.content;

  await fs.writeFile(filePath, fullContent, "utf-8");
  const stats = await fs.stat(filePath);
  const relativePath = relative(WORKSPACE_BASE_DIR, filePath);

  return {
    name: data.name,
    path: relativePath,
    type: data.type,
    description: data.description || "",
    content: data.content,
    updatedAt: stats.mtime.toISOString(),
  };
}

/**
 * Update an existing memory entry.
 */
export async function updateMemoryEntry(
  name: string,
  data: { content?: string; description?: string }
): Promise<MemoryEntry> {
  const entry = await getMemoryEntry(name);
  if (!entry) {
    throw new Error("Memory entry not found");
  }

  const filePath = join(WORKSPACE_BASE_DIR, entry.path);

  // Build updated content with frontmatter
  const frontmatterLines = ["---", `name: ${name}`, `type: ${entry.type}`];
  const description = data.description ?? entry.description;
  if (description) {
    frontmatterLines.push(`description: ${description}`);
  }
  frontmatterLines.push("---", "");

  const content = data.content ?? entry.content;
  const fullContent = frontmatterLines.join("\n") + content;

  await fs.writeFile(filePath, fullContent, "utf-8");
  const stats = await fs.stat(filePath);

  return {
    name,
    path: entry.path,
    type: entry.type,
    description,
    content,
    updatedAt: stats.mtime.toISOString(),
  };
}

/**
 * Delete a memory entry.
 */
export async function deleteMemoryEntry(name: string): Promise<boolean> {
  const entry = await getMemoryEntry(name);
  if (!entry) {
    throw new Error("Memory entry not found");
  }

  const filePath = join(WORKSPACE_BASE_DIR, entry.path);
  await fs.unlink(filePath);
  return true;
}

/**
 * Get workspace directory tree structure.
 */
export async function getWorkspaceDirectoryTree(
  dirPath: string = ""
): Promise<WorkspaceDirectory> {
  const safePath = validatePath(dirPath);
  const relativePath = relative(WORKSPACE_BASE_DIR, safePath);

  const files = await listWorkspaceFiles(dirPath);

  const subdirectories: WorkspaceDirectory[] = [];
  const fileList: WorkspaceFile[] = [];

  for (const file of files) {
    if (file.type === "directory") {
      const subdir = await getWorkspaceDirectoryTree(file.path);
      subdirectories.push(subdir);
    } else {
      fileList.push(file);
    }
  }

  return {
    name: basename(safePath) || "workspace",
    path: relativePath,
    subdirectories,
    files: fileList,
  };
}

/**
 * Get workspace statistics.
 */
export async function getWorkspaceStats(): Promise<WorkspaceStats> {
  const memoryEntries = await listMemoryEntries();
  const backups = await prisma.workspaceBackup.count();

  let totalFiles = 0;
  let totalDirectories = 0;
  let totalSize = 0;

  // Recursively count files and directories
  const countRecursive = async (dirPath: string) => {
    const entries = await listWorkspaceFiles(dirPath);
    for (const entry of entries) {
      if (entry.type === "directory") {
        totalDirectories++;
        await countRecursive(entry.path);
      } else {
        totalFiles++;
        totalSize += entry.size;
      }
    }
  };

  await countRecursive("");

  return {
    totalFiles,
    totalDirectories,
    totalSize,
    memoryEntries: memoryEntries.length,
    rulesCount: 0, // Rules are stored in conventions files
    backupsCount: backups,
  };
}

// Backup operations

/**
 * Create a workspace backup.
 */
export async function createWorkspaceBackup(
  userId: string,
  data: { name?: string; description?: string }
): Promise<WorkspaceBackup> {
  // Generate backup file name
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupName = data.name || `backup-${timestamp}`;
  const backupFileName = `${backupName}.tar.gz`;

  // Create backups directory
  const backupsDir = join(WORKSPACE_BASE_DIR, "backups");
  await fs.mkdir(backupsDir, { recursive: true });

  const backupFilePath = join(backupsDir, backupFileName);

  // Create tar.gz archive (using system tar command)
  // This is a simplified approach - in production you'd use archiver library
  const { exec } = await import("child_process");
  const util = await import("util");
  const execAsync = util.promisify(exec);

  try {
    await execAsync(
      `tar -czf "${backupFilePath}" -C "${WORKSPACE_BASE_DIR}" \
        --exclude="backups" \
        workspace memory skills agents workflows templates 2>/dev/null || true`
    );
  } catch {
    // If directories don't exist, create an empty backup
    await fs.writeFile(backupFilePath, "");
  }

  // Get file size
  const stats = await fs.stat(backupFilePath);

  // Save to database
  const backup = await prisma.workspaceBackup.create({
    data: {
      name: backupName,
      description: data.description,
      filePath: backupFilePath,
      size: stats.size,
      createdById: userId,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: "CREATE_BACKUP",
      entityType: "WorkspaceBackup",
      entityId: backup.id,
      userId,
      details: { name: backup.name, size: stats.size },
    },
  });

  return backup;
}

/**
 * List all workspace backups.
 */
export async function listWorkspaceBackups(): Promise<WorkspaceBackup[]> {
  return prisma.workspaceBackup.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Get a single backup by ID.
 */
export async function getWorkspaceBackup(
  id: string
): Promise<WorkspaceBackup | null> {
  return prisma.workspaceBackup.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Restore from a backup.
 */
export async function restoreWorkspaceBackup(
  id: string,
  userId: string
): Promise<boolean> {
  const backup = await getWorkspaceBackup(id);
  if (!backup) {
    throw new Error("Backup not found");
  }

  // Verify backup file exists
  try {
    await fs.access(backup.filePath);
  } catch {
    throw new Error("Backup file not found");
  }

  // Extract backup (using system tar command)
  const { exec } = await import("child_process");
  const util = await import("util");
  const execAsync = util.promisify(exec);

  // Create a restore point before restoring
  await createWorkspaceBackup(userId, {
    name: `pre-restore-${backup.name}`,
    description: `Auto-created before restoring ${backup.name}`,
  });

  // Extract the backup
  await execAsync(`tar -xzf "${backup.filePath}" -C "${WORKSPACE_BASE_DIR}"`);

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: "RESTORE_BACKUP",
      entityType: "WorkspaceBackup",
      entityId: id,
      userId,
      details: { name: backup.name },
    },
  });

  return true;
}

/**
 * Delete a backup.
 */
export async function deleteWorkspaceBackup(
  id: string,
  userId: string
): Promise<boolean> {
  const backup = await getWorkspaceBackup(id);
  if (!backup) {
    throw new Error("Backup not found");
  }

  // Delete the backup file
  try {
    await fs.unlink(backup.filePath);
  } catch {
    // File might not exist, continue with DB deletion
  }

  // Delete from database
  await prisma.workspaceBackup.delete({
    where: { id },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: "DELETE_BACKUP",
      entityType: "WorkspaceBackup",
      entityId: id,
      userId,
      details: { name: backup.name },
    },
  });

  return true;
}
