import { ITopicRepository } from '../types';
import { Topic } from '../../../types';
import { demoTopics } from '../../demo-data';

export class DemoTopicRepository implements ITopicRepository {
  private topics: Topic[] = [...demoTopics];

  async getAll(): Promise<Topic[]> {
    return [...this.topics];
  }

  async create(name: string, slug: string): Promise<Topic> {
    const newTopic: Topic = {
      id: `top_${Date.now()}`,
      user_id: 'user_faruk',
      name,
      slug,
      count: 0,
    };
    this.topics.push(newTopic);
    return newTopic;
  }
}
