import { calendarDate, normalize, order, text, webUrl } from '../common/validation.js';
import { resumeData } from './resume-data.js';

export function seedData() {
  const now = new Date();
  return {
    id: 1,
    name: text(resumeData.name, 'name', 120),
    description: text(resumeData.description, 'description', 5000),
    specialization: text(resumeData.specialization, 'specialization', 160),
    links: {
      create: resumeData.links.map((link, position) => ({
        label: text(link.label, 'label', 80),
        url: webUrl(link.url, 'url')!,
        position,
      })),
    },
    skills: {
      create: resumeData.skills.map((name, index) => ({
        name: text(name, 'name', 80),
        normalizedName: normalize(name),
        sortOrder: order(index),
      })),
    },
    experience: {
      create: resumeData.experience.map((item, index) => ({
        company: text(item.company, 'company', 160),
        position: text(item.position, 'position', 160),
        description: text(item.description, 'description', 5000),
        startDate: calendarDate(item.startDate, 'startDate', now),
        endDate: calendarDate(item.endDate, 'endDate', now),
        sortOrder: order(index),
      })),
    },
    projects: {
      create: resumeData.projects.map((item, index) => ({
        name: text(item.name, 'name', 160),
        description: text(item.description, 'description', 5000),
        websiteUrl: webUrl(item.websiteUrl, 'websiteUrl'),
        sortOrder: order(index),
      })),
    },
  };
}
