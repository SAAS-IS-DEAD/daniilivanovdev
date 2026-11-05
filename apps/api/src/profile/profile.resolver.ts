import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ProfileService } from './profile.service.js';
import { Experience, Profile, Project, Skill } from './profile.types.js';

@Resolver(() => Profile)
export class ProfileResolver {
  constructor(private readonly service: ProfileService) {}
  @Query(() => Profile, { nullable: true }) profile() {
    return this.service.profile();
  }
  @Query(() => [Skill]) skills() {
    return this.service.skills();
  }
  @Query(() => Skill, { nullable: true }) skill(@Args('id', { type: () => ID }) id: string) {
    return this.service.skill(id);
  }
  @Query(() => [Experience]) experience() {
    return this.service.experience();
  }
  @Query(() => Experience, { nullable: true }) experienceItem(
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.service.experienceItem(id);
  }
  @Query(() => [Project]) projects() {
    return this.service.projects();
  }
  @Query(() => Project, { nullable: true }) project(@Args('id', { type: () => ID }) id: string) {
    return this.service.project(id);
  }
}
