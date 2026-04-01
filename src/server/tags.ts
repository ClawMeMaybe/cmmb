import { prisma } from "@/lib/prisma";
import type { Tag, InstanceTag } from "@prisma/client";

export async function getTags(): Promise<Tag[]> {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
  });
  return tags;
}

export async function getTagById(id: string): Promise<Tag | null> {
  const tag = await prisma.tag.findUnique({
    where: { id },
  });
  return tag;
}

export async function getTagWithInstanceCount(
  id: string
): Promise<(Tag & { instanceCount: number }) | null> {
  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      _count: {
        select: { instances: true },
      },
    },
  });

  if (!tag) {
    return null;
  }

  return {
    ...tag,
    instanceCount: tag._count.instances,
  };
}

export async function createTag(data: {
  name: string;
  color?: string;
}): Promise<Tag> {
  const tag = await prisma.tag.create({
    data: {
      name: data.name,
      color: data.color ?? "#6B7280",
    },
  });
  return tag;
}

export async function updateTag(
  id: string,
  data: Partial<{ name: string; color: string }>
): Promise<Tag | null> {
  const tag = await prisma.tag.update({
    where: { id },
    data,
  });
  return tag;
}

export async function deleteTag(id: string): Promise<boolean> {
  await prisma.tag.delete({
    where: { id },
  });
  return true;
}

export async function getTagsForInstance(
  instanceId: string
): Promise<(InstanceTag & { tag: Tag })[]> {
  const instanceTags = await prisma.instanceTag.findMany({
    where: { instanceId },
    include: { tag: true },
    orderBy: { tag: { name: "asc" } },
  });
  return instanceTags;
}

export async function addTagToInstance(data: {
  instanceId: string;
  tagId: string;
  addedById?: string;
}): Promise<InstanceTag & { tag: Tag }> {
  const instanceTag = await prisma.instanceTag.create({
    data: {
      instanceId: data.instanceId,
      tagId: data.tagId,
      addedById: data.addedById ?? null,
    },
    include: { tag: true },
  });
  return instanceTag;
}

export async function removeTagFromInstance(
  instanceId: string,
  tagId: string
): Promise<boolean> {
  await prisma.instanceTag.delete({
    where: {
      instanceId_tagId: {
        instanceId,
        tagId,
      },
    },
  });
  return true;
}

export async function bulkTagOperation(data: {
  instanceIds: string[];
  tagIds: string[];
  action: "add" | "remove";
  addedById?: string;
}): Promise<{ success: boolean; count: number }> {
  if (data.action === "add") {
    // Create instance-tag associations for all combinations
    const createData = data.instanceIds.flatMap((instanceId) =>
      data.tagIds.map((tagId) => ({
        instanceId,
        tagId,
        addedById: data.addedById ?? null,
      }))
    );

    // Use createMany with skipDuplicates to avoid conflicts
    await prisma.instanceTag.createMany({
      data: createData,
      skipDuplicates: true,
    });

    return { success: true, count: createData.length };
  } else {
    // Delete instance-tag associations for all combinations
    const deleteConditions = data.instanceIds.flatMap((instanceId) =>
      data.tagIds.map((tagId) => ({
        instanceId,
        tagId,
      }))
    );

    // Delete each association
    await Promise.all(
      deleteConditions.map((cond) =>
        prisma.instanceTag
          .delete({
            where: {
              instanceId_tagId: cond,
            },
          })
          .catch(() => {
            // Ignore errors for non-existent associations
          })
      )
    );

    return { success: true, count: deleteConditions.length };
  }
}
