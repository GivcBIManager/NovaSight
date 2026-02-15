import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Book,
  Rocket,
  Database,
  GitBranch,
  Boxes,
  BarChart3,
  MessageSquare,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Shield,
  Zap,
  Users,
  HelpCircle,
  BookOpen,
  Video,
  FileText,
  Terminal,
  Lightbulb,
} from 'lucide-react'

interface DocSection {
  id: string
  title: string
  icon: React.ElementType
  description: string
  articles: Article[]
}

interface Article {
  title: string
  description: string
  readTime?: string
  tags?: string[]
}

const docSections: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Rocket,
    description: 'Learn the basics and get up and running quickly',
    articles: [
      {
        title: 'Quick Start Guide',
        description: 'Get started with NovaSight in just 10 minutes',
        readTime: '10 min',
        tags: ['beginner'],
      },
      {
        title: 'Core Concepts',
        description: 'Understand the key concepts and architecture',
        readTime: '15 min',
        tags: ['beginner'],
      },
      {
        title: 'Your First Dashboard',
        description: 'Build your first analytics dashboard step by step',
        readTime: '20 min',
        tags: ['beginner', 'tutorial'],
      },
      {
        title: 'User Interface Overview',
        description: 'Navigate the NovaSight interface like a pro',
        readTime: '8 min',
        tags: ['beginner'],
      },
    ],
  },
  {
    id: 'data-sources',
    title: 'Data Sources',
    icon: Database,
    description: 'Connect and manage your data sources',
    articles: [
      {
        title: 'Connecting to PostgreSQL',
        description: 'Set up a connection to your PostgreSQL database',
        readTime: '5 min',
        tags: ['database'],
      },
      {
        title: 'Connecting to MySQL',
        description: 'Configure MySQL as a data source',
        readTime: '5 min',
        tags: ['database'],
      },
      {
        title: 'Connecting to Amazon S3',
        description: 'Import data from S3 buckets',
        readTime: '8 min',
        tags: ['cloud', 'storage'],
      },
      {
        title: 'Sync Configuration',
        description: 'Configure automatic data synchronization',
        readTime: '10 min',
        tags: ['advanced'],
      },
      {
        title: 'Schema Introspection',
        description: 'Automatically discover your database schema',
        readTime: '7 min',
        tags: ['database'],
      },
      {
        title: 'Connection Security',
        description: 'Best practices for secure data connections',
        readTime: '12 min',
        tags: ['security'],
      },
    ],
  },
  {
    id: 'semantic-layer',
    title: 'Semantic Layer',
    icon: Boxes,
    description: 'Define business-friendly data models',
    articles: [
      {
        title: 'What is a Semantic Layer?',
        description: 'Understand the power of semantic modeling',
        readTime: '10 min',
        tags: ['concept'],
      },
      {
        title: 'Creating Models',
        description: 'Build your first semantic model',
        readTime: '15 min',
        tags: ['tutorial'],
      },
      {
        title: 'Defining Dimensions',
        description: 'Create dimensions for grouping and filtering',
        readTime: '8 min',
        tags: ['modeling'],
      },
      {
        title: 'Defining Measures',
        description: 'Build calculated measures and metrics',
        readTime: '10 min',
        tags: ['modeling'],
      },
      {
        title: 'Relationships & Joins',
        description: 'Connect tables with proper relationships',
        readTime: '12 min',
        tags: ['advanced'],
      },
      {
        title: 'Caching Strategies',
        description: 'Optimize query performance with caching',
        readTime: '10 min',
        tags: ['performance'],
      },
    ],
  },
  {
    id: 'pipelines',
    title: 'Data Pipelines',
    icon: GitBranch,
    description: 'Orchestrate and schedule data workflows',
    articles: [
      {
        title: 'Understanding DAGs',
        description: 'Learn about Directed Acyclic Graphs',
        readTime: '10 min',
        tags: ['concept'],
      },
      {
        title: 'Creating Your First DAG',
        description: 'Build a simple data pipeline',
        readTime: '15 min',
        tags: ['tutorial'],
      },
      {
        title: 'Scheduling Pipelines',
        description: 'Set up automated pipeline execution',
        readTime: '8 min',
        tags: ['scheduling'],
      },
      {
        title: 'Pipeline Monitoring',
        description: 'Monitor and troubleshoot pipeline runs',
        readTime: '10 min',
        tags: ['operations'],
      },
      {
        title: 'PySpark Transformations',
        description: 'Use PySpark for large-scale data processing',
        readTime: '20 min',
        tags: ['advanced', 'spark'],
      },
      {
        title: 'dbt Integration',
        description: 'Integrate dbt models into your pipelines',
        readTime: '15 min',
        tags: ['advanced', 'dbt'],
      },
    ],
  },
  {
    id: 'dashboards',
    title: 'Dashboards & Analytics',
    icon: BarChart3,
    description: 'Create visualizations and dashboards',
    articles: [
      {
        title: 'Dashboard Builder Overview',
        description: 'Introduction to the dashboard builder',
        readTime: '8 min',
        tags: ['beginner'],
      },
      {
        title: 'Chart Types',
        description: 'Explore all available chart types',
        readTime: '12 min',
        tags: ['visualization'],
      },
      {
        title: 'Filters & Interactivity',
        description: 'Add interactive filters to dashboards',
        readTime: '10 min',
        tags: ['tutorial'],
      },
      {
        title: 'Sharing Dashboards',
        description: 'Share dashboards with your team',
        readTime: '5 min',
        tags: ['collaboration'],
      },
      {
        title: 'Embedding Dashboards',
        description: 'Embed dashboards in external applications',
        readTime: '15 min',
        tags: ['advanced', 'integration'],
      },
      {
        title: 'Dashboard Performance',
        description: 'Optimize dashboard load times',
        readTime: '10 min',
        tags: ['performance'],
      },
    ],
  },
  {
    id: 'ai-assistant',
    title: 'AI Assistant',
    icon: MessageSquare,
    description: 'Query your data using natural language',
    articles: [
      {
        title: 'Ask Data in Plain English',
        description: 'Learn to query data with natural language',
        readTime: '8 min',
        tags: ['beginner', 'ai'],
      },
      {
        title: 'Effective Prompts',
        description: 'Write better questions for better answers',
        readTime: '10 min',
        tags: ['tips', 'ai'],
      },
      {
        title: 'Understanding AI Results',
        description: 'Interpret and verify AI-generated insights',
        readTime: '8 min',
        tags: ['ai'],
      },
      {
        title: 'AI Guardrails & Safety',
        description: 'How NovaSight keeps your queries safe',
        readTime: '10 min',
        tags: ['security', 'ai'],
      },
    ],
  },
]

const faqs = [
  {
    question: 'How do I reset my password?',
    answer: 'Click "Forgot Password" on the login page, enter your email, and follow the instructions sent to your inbox. If you don\'t receive the email, check your spam folder or contact your administrator.',
  },
  {
    question: 'What databases does NovaSight support?',
    answer: 'NovaSight supports PostgreSQL, MySQL, ClickHouse, SQL Server, Amazon Redshift, Google BigQuery, and Snowflake. We also support data import from Amazon S3, Google Cloud Storage, and Azure Blob Storage.',
  },
  {
    question: 'How is my data kept secure?',
    answer: 'NovaSight uses enterprise-grade security including encryption at rest and in transit, role-based access control (RBAC), tenant isolation, audit logging, and SOC 2 Type II compliance. All connections use SSL/TLS encryption.',
  },
  {
    question: 'Can I share dashboards with external users?',
    answer: 'Yes! You can share dashboards via public links (with optional password protection), embed them in external applications using our embedding API, or export them as PDF/PNG for offline sharing.',
  },
  {
    question: 'How does the natural language query feature work?',
    answer: 'NovaSight uses a local AI model (Ollama) to translate your natural language questions into SQL queries. The semantic layer helps the AI understand your business terminology, ensuring accurate query generation.',
  },
  {
    question: 'What is the Template Engine Rule?',
    answer: 'For security, NovaSight generates all executable code (DAGs, PySpark jobs, dbt models) from pre-approved templates. This prevents arbitrary code execution and ensures all operations are safe and auditable.',
  },
  {
    question: 'How do I schedule automatic data refreshes?',
    answer: 'Navigate to your data source settings and configure a sync schedule. You can set refreshes to run hourly, daily, weekly, or on a custom cron schedule. You can also trigger manual refreshes anytime.',
  },
  {
    question: 'What\'s the difference between dimensions and measures?',
    answer: 'Dimensions are attributes you group or filter by (e.g., Product Category, Region, Date). Measures are quantitative values you calculate (e.g., Total Sales, Average Order Value, Count of Orders).',
  },
]

const quickLinks = [
  {
    title: 'API Reference',
    description: 'Complete API documentation',
    icon: Terminal,
    href: '/docs/api',
  },
  {
    title: 'Video Tutorials',
    description: 'Watch step-by-step guides',
    icon: Video,
    href: '/docs/videos',
  },
  {
    title: 'Release Notes',
    description: 'See what\'s new',
    icon: FileText,
    href: '/docs/releases',
  },
  {
    title: 'Best Practices',
    description: 'Tips from the experts',
    icon: Lightbulb,
    href: '/docs/best-practices',
  },
]

export function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<{ sectionId: string; title: string } | null>(null)

  const filteredSections = docSections.filter((section) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      section.title.toLowerCase().includes(query) ||
      section.description.toLowerCase().includes(query) ||
      section.articles.some(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.description.toLowerCase().includes(query) ||
          article.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    )
  })

  const handleArticleClick = (sectionId: string, articleTitle: string) => {
    setSelectedArticle({ sectionId, title: articleTitle })
  }

  const handleBackFromArticle = () => {
    setSelectedArticle(null)
  }

  // If an article is selected, show article content
  if (selectedArticle) {
    const section = docSections.find(s => s.id === selectedArticle.sectionId)
    const article = section?.articles.find(a => a.title === selectedArticle.title)
    
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={handleBackFromArticle}
          className="gap-2"
        >
          ← Back to Documentation
        </Button>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              {section && (
                <div className="rounded-lg bg-primary/10 p-2">
                  <section.icon className="h-6 w-6 text-primary" />
                </div>
              )}
              <Badge variant="secondary">{section?.title}</Badge>
            </div>
            <CardTitle className="text-2xl">{selectedArticle.title}</CardTitle>
            <CardDescription>{article?.description}</CardDescription>
            {article?.readTime && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{article.readTime} read</Badge>
                {article.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p className="text-muted-foreground">
              This documentation article is coming soon. We're working on creating comprehensive 
              guides for all features of NovaSight.
            </p>
            <div className="mt-8 p-4 rounded-lg bg-muted">
              <h4 className="font-medium mb-2">In the meantime:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Check out our FAQ section for quick answers</li>
                <li>Contact support if you have specific questions</li>
                <li>Join our community forum for discussions</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Book className="h-8 w-8 text-primary" />
            Documentation
          </h1>
          <p className="text-muted-foreground mt-1">
            Everything you need to know about NovaSight
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">50+</p>
              <p className="text-sm text-muted-foreground">Articles</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-green-500/10 p-3">
              <Video className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">20+</p>
              <p className="text-sm text-muted-foreground">Video Tutorials</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-purple-500/10 p-3">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">6</p>
              <p className="text-sm text-muted-foreground">Topic Areas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-orange-500/10 p-3">
              <HelpCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">8</p>
              <p className="text-sm text-muted-foreground">FAQs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="guides" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="guides">Guides</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* Guides Tab */}
        <TabsContent value="guides" className="space-y-6">
          {selectedSection ? (
            // Detailed section view
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => setSelectedSection(null)}
                className="gap-2"
              >
                ← Back to all guides
              </Button>
              {(() => {
                const section = docSections.find((s) => s.id === selectedSection)
                if (!section) return null
                return (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <section.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle>{section.title}</CardTitle>
                          <CardDescription>{section.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {section.articles.map((article, index) => (
                          <div
                            key={index}
                            className="flex items-start justify-between p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                            onClick={() => handleArticleClick(section.id, article.title)}
                          >
                            <div className="space-y-1">
                              <h4 className="font-medium">{article.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {article.description}
                              </p>
                              <div className="flex items-center gap-2 pt-2">
                                {article.readTime && (
                                  <Badge variant="secondary" className="text-xs">
                                    {article.readTime} read
                                  </Badge>
                                )}
                                {article.tags?.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}
            </div>
          ) : (
            // Section grid view
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredSections.map((section) => (
                <Card
                  key={section.id}
                  className="group cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                  onClick={() => setSelectedSection(section.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                        <section.icon className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="secondary">{section.articles.length} articles</Badge>
                    </div>
                    <CardTitle className="mt-4">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {section.articles.slice(0, 3).map((article, index) => (
                        <li key={index} className="flex items-center gap-2 text-muted-foreground">
                          <ChevronRight className="h-3 w-3" />
                          {article.title}
                        </li>
                      ))}
                      {section.articles.length > 3 && (
                        <li className="text-primary text-sm font-medium pt-1">
                          + {section.articles.length - 3} more articles
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* FAQ Tab */}
        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Quick answers to common questions about NovaSight
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          {/* Quick Links */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((link) => (
              <Link key={link.title} to={link.href}>
                <Card
                  className="group cursor-pointer hover:shadow-md transition-all hover:border-primary/50 h-full"
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                      <link.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium flex items-center gap-2">
                        {link.title}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </h4>
                      <p className="text-sm text-muted-foreground">{link.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Additional Resources */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Feature Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  Key Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-100 p-1.5">
                    <Database className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Multi-Source Connectivity</h4>
                    <p className="text-sm text-muted-foreground">
                      Connect to databases, cloud storage, and APIs in minutes
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-green-100 p-1.5">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">AI-Powered Queries</h4>
                    <p className="text-sm text-muted-foreground">
                      Ask questions in plain English and get instant insights
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-purple-100 p-1.5">
                    <Boxes className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Semantic Layer</h4>
                    <p className="text-sm text-muted-foreground">
                      Define business-friendly data models for consistent metrics
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-orange-100 p-1.5">
                    <Shield className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Enterprise Security</h4>
                    <p className="text-sm text-muted-foreground">
                      Multi-tenant isolation, RBAC, and audit logging
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Need Help */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Need More Help?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Can't find what you're looking for? Our team is here to help.
                </p>
                <div className="space-y-3">
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <MessageSquare className="h-4 w-4" />
                    Contact Support
                  </Button>
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <Users className="h-4 w-4" />
                    Join Community Forum
                  </Button>
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <Video className="h-4 w-4" />
                    Schedule a Demo
                  </Button>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    <strong>Enterprise customers:</strong> Access priority support through
                    your dedicated account manager.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Keyboard Shortcuts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Keyboard Shortcuts
              </CardTitle>
              <CardDescription>
                Work faster with these handy shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">Global Search</span>
                  <kbd className="px-2 py-1 text-xs bg-background border rounded">Ctrl + K</kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">New Dashboard</span>
                  <kbd className="px-2 py-1 text-xs bg-background border rounded">Ctrl + N</kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">Run Query</span>
                  <kbd className="px-2 py-1 text-xs bg-background border rounded">Ctrl + Enter</kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">Toggle Sidebar</span>
                  <kbd className="px-2 py-1 text-xs bg-background border rounded">Ctrl + B</kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">Save Changes</span>
                  <kbd className="px-2 py-1 text-xs bg-background border rounded">Ctrl + S</kbd>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">Open Settings</span>
                  <kbd className="px-2 py-1 text-xs bg-background border rounded">Ctrl + ,</kbd>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
