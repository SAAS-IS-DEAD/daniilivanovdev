import type { Prisma } from '../generated/prisma/client.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export const contentOrder = [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] as const;
export const skillSelect = { id: true, name: true, sortOrder: true } as const;
export const experienceSelect = {
  id: true,
  company: true,
  position: true,
  description: true,
  startDate: true,
  endDate: true,
  sortOrder: true,
} as const;
export const projectSelect = {
  id: true,
  name: true,
  description: true,
  websiteUrl: true,
  repositoryUrl: true,
  imageUrl: true,
  sortOrder: true,
} as const;
export const profileSelect = {
  id: true,
  name: true,
  description: true,
  specialization: true,
  links: { orderBy: { position: 'asc' }, select: { id: true, label: true, url: true } },
  skills: { orderBy: [...contentOrder], select: skillSelect },
  experience: { orderBy: [...contentOrder], select: experienceSelect },
  projects: { orderBy: [...contentOrder], select: projectSelect },
} satisfies Prisma.ProfileSelect;

@Injectable()
export class ProfileRepository {
  constructor(private readonly db: PrismaService) {}
  profile() {
    return this.db.profile.findUnique({ where: { id: 1 }, select: profileSelect });
  }
  skills() {
    return this.db.skill.findMany({
      where: { profileId: 1 },
      orderBy: [...contentOrder],
      select: skillSelect,
    });
  }
  skill(id: string) {
    return this.db.skill.findUnique({ where: { id, profileId: 1 }, select: skillSelect });
  }
  experience() {
    return this.db.experience.findMany({
      where: { profileId: 1 },
      orderBy: [...contentOrder],
      select: experienceSelect,
    });
  }
  experienceItem(id: string) {
    return this.db.experience.findUnique({ where: { id, profileId: 1 }, select: experienceSelect });
  }
  projects() {
    return this.db.project.findMany({
      where: { profileId: 1 },
      orderBy: [...contentOrder],
      select: projectSelect,
    });
  }
  project(id: string) {
    return this.db.project.findUnique({ where: { id, profileId: 1 }, select: projectSelect });
  }
}
