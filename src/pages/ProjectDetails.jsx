import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, DollarSign, Briefcase, CheckCircle2, FileText, TrendingUp, ArrowLeft 
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import ProjectTimeline from '../components/developer/ProjectTimeline';
import MarketInsights from '../components/developer/MarketInsights';

export default function ProjectDetails() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('id');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.DevelopmentProject.list().then(
      projects => projects.find(p => p.id === projectId)
    ),
    enabled: !!projectId
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: () => base44.entities.ProjectMilestone.filter(
      { project_id: projectId },
      'order'
    ),
    enabled: !!projectId
  });

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('DeveloperProjectShowcase')}>
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              Project not found
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      {project.hero_image_url && (
        <div className="w-full h-96 overflow-hidden">
          <img
            src={project.hero_image_url}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <Link to={createPageUrl('DeveloperProjectShowcase')}>
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </Link>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-4xl font-bold text-slate-900">{project.name}</h1>
              <Badge className="bg-green-100 text-green-800">
                {project.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-lg text-slate-600">
              <MapPin className="w-5 h-5" />
              {project.location}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Total Units</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{project.total_units || '—'}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Project Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(project.estimated_value / 1000000).toFixed(1)}M
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Price Range</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {project.summary_stats?.min_price && project.summary_stats?.max_price ? (
                    `$${(project.summary_stats.min_price / 1000000).toFixed(1)}M - $${(project.summary_stats.max_price / 1000000).toFixed(1)}M`
                  ) : (
                    '—'
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {project.estimated_completion?.split('-').slice(0, 2).join('/')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description & Amenities */}
          <Card>
            <CardHeader>
              <CardTitle>Project Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700 leading-relaxed">{project.description}</p>

              {project.amenities?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.amenities.map((amenity, idx) => (
                      <Badge key={idx} variant="secondary">{amenity}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="timeline">
                <Briefcase className="w-4 h-4 mr-2" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="insights">
                <TrendingUp className="w-4 h-4 mr-2" />
                Market Insights
              </TabsTrigger>
              <TabsTrigger value="gallery">
                <FileText className="w-4 h-4 mr-2" />
                Gallery
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-6">
              <ProjectTimeline milestones={milestones} />
            </TabsContent>

            <TabsContent value="insights" className="mt-6">
              <MarketInsights project={project} />
            </TabsContent>

            <TabsContent value="gallery" className="mt-6">
              {project.project_images?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {project.project_images.map((img, idx) => (
                    <div key={idx} className="bg-slate-200 rounded-lg overflow-hidden h-48">
                      <img
                        src={img}
                        alt={`Project ${idx}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-slate-500">
                    No additional images
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}