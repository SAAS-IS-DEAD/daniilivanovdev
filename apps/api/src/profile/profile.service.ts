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
  constructor(private readonly repository: ProfileRepository) {}
  profile() {
    return this.repository.profile();
  }
  skills() {
    return this.repository.skills();
  }
  skill(id: string) {
    return this.repository.skill(validId(id));
  }
  experience() {
    return this.repository.experience();
  }
  experienceItem(id: string) {
    return this.repository.experienceItem(validId(id));
  }
  projects() {
    return this.repository.projects();
  }
  project(id: string) {
    return this.repository.project(validId(id));
  }
}
