export type TimelineItem = {
  id: string
  year: string
  title: string
  category: string
  description: string
  location: string
}

export type ProjectItem = {
  id: string
  name: string
  tag: string
  year: string
  summary: string
  technology: string[]
  accent: string
}

export type SkillGroup = {
  id: string
  label: string
  skills: string[]
}

export type ExperienceItem = {
  id: string
  role: string
  organization: string
  period: string
  work: string
  technology: string[]
  outcome: string
}

export type AchievementItem = {
  id: string
  title: string
  type: string
  date: string
  description: string
  relatedProject: string
}

export type WorldNode = {
  id: string
  name: string
  label: string
  x: number
  y: number
  accent: string
  kind: 'origin' | 'workshop' | 'project' | 'research' | 'experience' | 'future'
  title: string
  description: string
  details: string[]
}

export const portfolioData = {
  about: {
    name: 'SHIVANG SAGAR',
    identity: 'AI/ML Engineer • Creative Technologist • Builder',
    tagline: 'DON\'T READ MY JOURNEY. EXPERIENCE IT.',
    summary:
      'Shivang builds systems that connect AI, design, 3D, computer vision and interactive web technology into products that feel tangible and cinematic.'
  },
  timeline: [
    {
      id: 'origin-2022',
      year: '2022',
      title: 'RBSE 10th',
      category: 'Education',
      description: 'The first spark of technical curiosity and structured learning.',
      location: 'Origin'
    },
    {
      id: 'origin-2024-a',
      year: '2024',
      title: '12th completed',
      category: 'Education',
      description: 'Academic foundations deepen while creative exploration expands.',
      location: 'Origin'
    },
    {
      id: 'origin-2024-b',
      year: '2024',
      title: 'B.Tech begins',
      category: 'Education',
      description: 'Formal engineering journey begins with experimentation and product thinking.',
      location: 'Origin'
    },
    {
      id: 'workshop',
      year: '2025',
      title: 'Builder\'s workshop',
      category: 'Projects',
      description: 'Rapid prototyping of AI, computer vision and spatial web experiences.',
      location: 'Workshop'
    },
    {
      id: 'holopad',
      year: '2026',
      title: 'HoloPad',
      category: 'Project',
      description: 'Browser-native spatial computing platform blending AI and 3D interfaces.',
      location: 'Project Lab'
    },
    {
      id: 'future',
      year: 'NOW',
      title: 'Future',
      category: 'Next chapter',
      description: 'The next milestone is still being built as the story continues.',
      location: 'Future'
    }
  ] as TimelineItem[],
  projects: [
    {
      id: 'holopad',
      name: 'HOLOPAD',
      tag: 'Browser-native spatial computing',
      year: '2026',
      summary:
        'A spatial computing system where 2D workflows become 3D, AI-assisted and holographic experiences.',
      technology: ['React', 'Three.js', 'WebGL', 'GLSL', 'MediaPipe', 'SAM', 'Depth Estimation', 'FastAPI', 'Node.js', 'MongoDB', 'RAG'],
      accent: '#66d9ff'
    },
    {
      id: 'sketchify',
      name: 'SKETCHIFY',
      tag: 'Interactive creative application',
      year: '2025',
      summary:
        'A creative tool for turning sketches and ideation into visual experiences with digital artistry at the center.',
      technology: ['React', 'TypeScript', 'Canvas', 'AI', 'Creative tooling'],
      accent: '#c084fc'
    },
    {
      id: 'saathi',
      name: 'SAATHI',
      tag: 'Multilingual AI assistant',
      year: '2025',
      summary:
        'A multilingual AI assistant designed to support conversations, retrieval, and contextual understanding.',
      technology: ['RAG', 'BERT', 'LLM', 'Vector Search', 'Python', 'FastAPI'],
      accent: '#5eead4'
    }
  ] as ProjectItem[],
  skills: [
    {
      id: 'ai',
      label: 'AI / ML',
      skills: ['Python', 'Machine Learning', 'Deep Learning', 'BERT', 'RAG']
    },
    {
      id: 'web',
      label: 'WEB DEVELOPMENT',
      skills: ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Express']
    },
    {
      id: 'graphics',
      label: '3D / GRAPHICS',
      skills: ['Three.js', 'WebGL', 'GLSL', 'React Three Fiber']
    },
    {
      id: 'backend',
      label: 'BACKEND',
      skills: ['FastAPI', 'MongoDB', 'PostgreSQL', 'REST APIs']
    },
    {
      id: 'devops',
      label: 'DEVOPS',
      skills: ['Docker', 'Linux', 'Git', 'Deployment']
    },
    {
      id: 'research',
      label: 'RESEARCH',
      skills: ['Computer Vision', 'AI Experiments', 'Spatial Interfaces', 'Evaluation']
    }
  ] as SkillGroup[],
  experience: [
    {
      id: 'experience-1',
      role: 'AI / ML Engineer',
      organization: 'Portfolio placeholder',
      period: '2024 — 2026',
      work: 'Building AI products, experiments and interactive systems at the intersection of engineering and creativity.',
      technology: ['Python', 'Machine Learning', 'WebGL', 'Three.js'],
      outcome: 'Placeholder experience entry. Update with real role and impact as needed.'
    }
  ] as ExperienceItem[],
  achievements: [
    {
      id: 'achievement-1',
      title: 'AI Experiment Lab',
      type: 'Research',
      date: '2025',
      description: 'Exploration of AI, computer vision and spatial interfaces in browser-native systems.',
      relatedProject: 'HOLOPAD'
    },
    {
      id: 'achievement-2',
      title: 'Creative Systems',
      type: 'Product',
      date: '2025',
      description: 'Built interactive tools for experimentation and creative workflows.',
      relatedProject: 'SKETCHIFY'
    }
  ] as AchievementItem[],
  menu: [
    { id: 'world', label: 'ENTER WORLD' },
    { id: 'timeline', label: 'EXPLORE TIMELINE' },
    { id: 'meg', label: 'MEET MEG' },
    { id: 'resume', label: 'RESUME' }
  ],
  contact: {
    email: 'hello@shivangsagar.dev',
    github: 'github.com/shivang-sagar',
    linkedin: 'linkedin.com/in/shivang-sagar',
    note: 'Placeholder contact links for editing.'
  },
  megPrompts: [
    {
      trigger: 'What did Shivang build in 2026?',
      response: 'Let\'s inspect the HoloPad timeline entry and project lab.',
      action: 'holopad'
    },
    {
      trigger: 'Show me the timeline.',
      response: 'The journey is mapped as a chronological path from origin to future.',
      action: 'timeline'
    },
    {
      trigger: 'What skills are in the stack?',
      response: 'Shivang combines AI, 3D, backend and product engineering into an experimental stack.',
      action: 'skills'
    },
    {
      trigger: 'Where is the resume?',
      response: 'The digital resume is available from the inventory and HUD.',
      action: 'resume'
    }
  ]
}

export const worldNodes: WorldNode[] = [
  {
    id: 'origin',
    name: 'ORIGIN',
    label: '2022 → 2024',
    x: 0.14,
    y: 0.7,
    accent: '#7dd3fc',
    kind: 'origin',
    title: 'Origin',
    description: 'Early foundations, education and the start of the journey.',
    details: ['2022 — RBSE 10th', '2024 — 12th completed', '2024 — B.Tech begins']
  },
  {
    id: 'workshop',
    name: 'WORKSHOP',
    label: 'BUILDER',
    x: 0.35,
    y: 0.48,
    accent: '#8b5cf6',
    kind: 'workshop',
    title: 'Builder\'s Workshop',
    description: 'A laboratory for experiments, product prototypes and technical exploration.',
    details: ['HOLOPAD', 'SKETCHIFY', 'SAATHI', 'AI experiments', 'Research']
  },
  {
    id: 'holopad',
    name: 'HOLOPAD',
    label: 'PROJECT',
    x: 0.58,
    y: 0.34,
    accent: '#5eead4',
    kind: 'project',
    title: 'HoloPad',
    description: 'Browser-native spatial computing created as a flagship AI + 3D experience.',
    details: ['React', 'Three.js', 'WebGL', 'GLSL', 'MediaPipe', 'RAG']
  },
  {
    id: 'sketchify',
    name: 'SKETCHIFY',
    label: 'CREATIVE',
    x: 0.74,
    y: 0.56,
    accent: '#f9a8d4',
    kind: 'project',
    title: 'Sketchify',
    description: 'A digital-art environment for interactive creation and visual experimentation.',
    details: ['Canvas', 'Creative tooling', 'AI-assisted ideation']
  },
  {
    id: 'saathi',
    name: 'SAATHI',
    label: 'AI',
    x: 0.24,
    y: 0.26,
    accent: '#a3e635',
    kind: 'research',
    title: 'Saathi',
    description: 'A multilingual AI assistant exploring retrieval, contextual understanding and dialogue.',
    details: ['RAG', 'BERT', 'LLM', 'Vector Search']
  },
  {
    id: 'future',
    name: 'FUTURE',
    label: 'NEXT CHAPTER',
    x: 0.82,
    y: 0.24,
    accent: '#fbbf24',
    kind: 'future',
    title: 'The Next Chapter',
    description: 'The future remains open, unfinished and still being built.',
    details: ['THE NEXT CHAPTER', 'IS STILL BEING BUILT.']
  }
]

export const worldMapNodes = [
  'ORIGIN',
  'BUILDER\'S WORKSHOP',
  'PROJECT LAB',
  'HOLOPAD',
  'RESEARCH',
  'EXPERIENCE',
  'FUTURE'
]

export const resumeDocument = {
  title: 'SHIVANG_SAGAR_RESUME',
  placeholder: 'Resume asset placeholder. Replace with the actual PDF or link in the data source.'
}
