import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { DateScalar } from '../graphql/scalars.js';

@ObjectType()
export class ProfileLink {
  @Field(() => ID) id!: string;
  @Field() label!: string;
  @Field() url!: string;
}
@ObjectType()
export class Skill {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => Int) sortOrder!: number;
}
@ObjectType()
export class Experience {
  @Field(() => ID) id!: string;
  @Field() company!: string;
  @Field() position!: string;
  @Field(() => String, { nullable: true }) description!: string | null;
  @Field(() => DateScalar) startDate!: Date;
  @Field(() => DateScalar, { nullable: true }) endDate!: Date | null;
  @Field(() => Int) sortOrder!: number;
}
@ObjectType()
export class Project {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() description!: string;
  @Field(() => String, { nullable: true }) websiteUrl!: string | null;
  @Field(() => String, { nullable: true }) repositoryUrl!: string | null;
  @Field(() => String, { nullable: true }) imageUrl!: string | null;
  @Field(() => Int) sortOrder!: number;
}
@ObjectType()
export class Profile {
  @Field(() => ID) id!: number;
  @Field() name!: string;
  @Field() description!: string;
  @Field(() => String, { nullable: true }) specialization!: string | null;
  @Field(() => [ProfileLink]) links!: ProfileLink[];
  @Field(() => [Skill]) skills!: Skill[];
  @Field(() => [Experience]) experience!: Experience[];
  @Field(() => [Project]) projects!: Project[];
}
