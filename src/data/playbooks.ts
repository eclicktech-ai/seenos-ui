export type PlaybookCategory = 'research' | 'build' | 'optimize' | 'monitor';

export interface PlaybookOption {
  label: string;
  value: string;
  defaultPrompt: string;
}

export interface Playbook {
  id: string;
  title: string;
  description: string;
  category: PlaybookCategory;
  agentName: string;
  autoActions: string[];
  outputs: string[];
  tags: string[];
  options?: PlaybookOption[];
}

export const playbooks: Playbook[] = [];

