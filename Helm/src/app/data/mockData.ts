export type Priority = 'P0' | 'P1' | 'P2';
export type Status = 'On Track' | 'At Risk' | 'Complete' | 'Blocked' | 'Not Started';
export type Category = 'Engineering' | 'Design' | 'Sales' | 'Product' | 'Operations';

export interface Initiative {
  id: string;
  name: string;
  category: Category;
  priority: Priority;
  isBigRock: boolean;
  owner: string;
  status: Status;
  questions: string;
  description: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  dependencies?: string[];
  budget?: number;
  timeSpent?: number;
  estimatedTime?: number;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface TrackerSection {
  id: string;
  title: string;
  initiatives: Initiative[];
}

export const mockInitiatives: Initiative[] = [
  {
    id: '1',
    name: 'Revenue Intelligence Platform Migration',
    category: 'Engineering',
    priority: 'P0',
    isBigRock: true,
    owner: 'Sarah Chen',
    status: 'On Track',
    questions: 'Timeline for API integration?',
    description: 'Migrate legacy systems to new revenue intelligence platform',
    startDate: new Date('2026-01-15'),
    endDate: new Date('2026-04-30'),
    progress: 65
  },
  {
    id: '2',
    name: 'Deal Desk Automation Workflow',
    category: 'Operations',
    priority: 'P0',
    isBigRock: true,
    owner: 'Marcus Rodriguez',
    status: 'At Risk',
    questions: 'Need executive approval for budget increase',
    description: 'Automate quote-to-cash process with AI-powered approvals',
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-05-15'),
    progress: 42
  },
  {
    id: '3',
    name: 'Sales Compensation Dashboard V2',
    category: 'Product',
    priority: 'P1',
    isBigRock: false,
    owner: 'Emily Watson',
    status: 'Complete',
    questions: '',
    description: 'Enhanced visualization for sales team compensation tracking',
    startDate: new Date('2026-01-05'),
    endDate: new Date('2026-02-28'),
    progress: 100
  },
  {
    id: '4',
    name: 'Territory Planning Tool',
    category: 'Sales',
    priority: 'P1',
    isBigRock: true,
    owner: 'David Park',
    status: 'On Track',
    questions: 'When can we pilot with West region?',
    description: 'AI-driven territory assignment and capacity planning',
    startDate: new Date('2026-02-10'),
    endDate: new Date('2026-06-30'),
    progress: 38
  },
  {
    id: '5',
    name: 'Forecasting Model Refinement',
    category: 'Operations',
    priority: 'P0',
    isBigRock: true,
    owner: 'Lisa Kumar',
    status: 'On Track',
    questions: '',
    description: 'Improve accuracy of quarterly revenue forecasting',
    startDate: new Date('2026-01-20'),
    endDate: new Date('2026-04-15'),
    progress: 58
  },
  {
    id: '6',
    name: 'CPQ System Integration',
    category: 'Engineering',
    priority: 'P2',
    isBigRock: false,
    owner: 'James Mitchell',
    status: 'Not Started',
    questions: 'Vendor selection in progress',
    description: 'Integrate Configure-Price-Quote system with CRM',
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-07-31'),
    progress: 0
  },
  {
    id: '7',
    name: 'RevOps Design System',
    category: 'Design',
    priority: 'P1',
    isBigRock: false,
    owner: 'Alex Thompson',
    status: 'On Track',
    questions: '',
    description: 'Unified design language for all RevOps tools',
    startDate: new Date('2026-01-10'),
    endDate: new Date('2026-03-25'),
    progress: 72
  },
  {
    id: '8',
    name: 'Customer Health Score Automation',
    category: 'Product',
    priority: 'P0',
    isBigRock: true,
    owner: 'Nina Patel',
    status: 'Blocked',
    questions: 'Data pipeline issues - need engineering support',
    description: 'Automated customer health scoring based on usage data',
    startDate: new Date('2026-02-05'),
    endDate: new Date('2026-04-20'),
    progress: 25
  },
  {
    id: '9',
    name: 'Quote Approval Streamlining',
    category: 'Operations',
    priority: 'P1',
    isBigRock: false,
    owner: 'Robert Kim',
    status: 'At Risk',
    questions: 'Stakeholder alignment needed',
    description: 'Reduce quote approval time from 3 days to 4 hours',
    startDate: new Date('2026-02-15'),
    endDate: new Date('2026-05-01'),
    progress: 30
  },
  {
    id: '10',
    name: 'Sales Enablement Portal',
    category: 'Sales',
    priority: 'P2',
    isBigRock: false,
    owner: 'Jennifer Lopez',
    status: 'On Track',
    questions: '',
    description: 'Central hub for sales materials and playbooks',
    startDate: new Date('2026-01-25'),
    endDate: new Date('2026-06-15'),
    progress: 48
  }
];

export const trackerSections: TrackerSection[] = [
  {
    id: 'q1-initiatives',
    title: 'Q1 2026 Strategic Initiatives',
    initiatives: mockInitiatives.slice(0, 5)
  },
  {
    id: 'ongoing-projects',
    title: 'Ongoing Projects',
    initiatives: mockInitiatives.slice(5, 8)
  },
  {
    id: 'pipeline',
    title: 'Pipeline & Planning',
    initiatives: mockInitiatives.slice(8)
  }
];

export const kpiData = {
  solvedYTD: 12,
  inProgress: 8,
  atRiskBlocked: 3,
  bigRocksCount: 6,
  overallProgress: 54
};