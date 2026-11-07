import { CacheService } from '../cache/cache.service.js';
import { Injectable } from '@nestjs/common';
import { ProfileRepository } from './profile.repository.js';
import { badInput } from '../common/errors.js';

function validId(id: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return badInput('id', 'Некорректный идентификатор');
  return id;
}
@Injectable()
export class ProfileService {
  constructor(
    private readonly repository: ProfileRepository,
    private readonly cache: CacheService,
  ) {}
  profile() {
    return this.cache.read('profile', () => this.repository.profile());
  }
  skills() {
    return this.cache.read('skills', () => this.repository.skills());
  }
  skill(id: string) {
    const checked = validId(id);
    return this.cache.read(`skill:${checked.toLowerCase()}`, () => this.repository.skill(checked));
  }
  experience() {
    return this.cache.read('experience', () => this.repository.experience());
  }
  experienceItem(id: string) {
    const checked = validId(id);
    return this.cache.read(`experienceItem:${checked.toLowerCase()}`, () =>
      this.repository.experienceItem(checked),
    );
  }
  projects() {
    return this.cache.read('projects', () => this.repository.projects());
  }
  project(id: string) {
    const checked = validId(id);
    return this.cache.read(`project:${checked.toLowerCase()}`, () =>
      this.repository.project(checked),
    );
  }
}
