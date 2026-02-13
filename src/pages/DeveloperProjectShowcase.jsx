import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, DollarSign, Home, Calendar, TrendingUp, 
  Zap, Share2, Plus, Edit2 
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import ProjectTimeline from '../components/developer/ProjectTimeline';
import MarketInsights from '../components/developer/MarketInsights';

export default function DeveloperProjectShowcase() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['dev-projects', user?.email],
    queryFn: () => base44.entities.DevelopmentProject.filter(
      { developer_email: user?.email },
      '-created_date'
    ),
    enabled: !!user?.email
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['project-milestones'],
    queryFn: async () => {
      if (projects.length === 0) return [];
      const allMilestones = [];
      for (const project of projects) {
        const mils = await base44.entities.ProjectMilestone.filter(
          { project_id: project.id },
          'order'
        );
        allMilestones.push(...(mils || []));
      }
      return allMilestones;
    },
    enabled: !!projects.length
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getMilestonesForProject = (projectId) =>
    milestones.filter(m => m.project_id === projectId);

  const statusColor = {
    planning: 'bg-blue-100 text-blue-800',
    pre_construction: 'bg-purple-100 text-purple-800',
    construction: 'bg-orange-100 text-orange-800',
    pre_sale: 'bg-yellow-100 text-yellow-800',
    sales_open: 'bg-green-100 text-green-800',
    completed: 'bg-slate-100 text-slate-800'
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Development Projects</h1>
            <p className="text-slate-600 mt-1">Showcase your pipeline and connect with buyers</p>
          </div>
          <Link to={createPageUrl('DeveloperProjectEditor')}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <Home className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No projects yet</p>
              <p className="text-sm mt-2">Create a project to showcase your development</p>
              <Link to={createPageUrl('DeveloperProjectEditor')}>
                <Button className="mt-4">Create First Project</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {projects.map(project => (
              <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-all">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                  {/* Hero Image */}
                  <div className="md:col-span-1 bg-slate-200 h-48 md:h-64 overflow-hidden">
                    {project.hero_image_url && (
                      <img
                        src={project.hero_image_url}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Project Info */}
                  <div className="md:col-span-2 p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">{project.name}</h3>
                        <div className="flex items-center gap-2 text-slate-600 mt-1">
                          <MapPin className="w-4 h-4" />
                          <span>{project.location}</span>
                        </div>
                      </div>
                      <Badge className={statusColor[project.status]}>
                        {project.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <p className="text-slate-700 text-sm">{project.description}</p>

                    {/* Quick Stats - Clickable */}
                    <Link to={createPageUrl(`ProjectDetails?id=${project.id}`)}>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-all">
                        {project.total_units && (
                          <div className="text-sm">
                            <span className="text-slate-600">Units</span>
                            <p className="font-semibold text-slate-900">{project.total_units}</p>
                          </div>
                        )}
                        {project.summary_stats?.min_price && (
                          <div className="text-sm">
                            <span className="text-slate-600">Starting at</span>
                            <p className="font-semibold text-slate-900">
                              ${(project.summary_stats.min_price / 1000000).toFixed(1)}M
                            </p>
                          </div>
                        )}
                        {project.estimated_completion && (
                          <div className="text-sm">
                            <span className="text-slate-600">Completion</span>
                            <p className="font-semibold text-slate-900">
                              {format(new Date(project.estimated_completion), 'MMM yyyy')}
                            </p>
                          </div>
                        )}
                        {project.amenities?.length > 0 && (
                          <div className="text-sm">
                            <span className="text-slate-600">Amenities</span>
                            <p className="font-semibold text-slate-900">{project.amenities.length}</p>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Link to={createPageUrl(`ProjectDetails?id=${project.id}`)}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      <Link to={createPageUrl(`DeveloperProjectEditor?id=${project.id}`)}>
                        <Button variant="outline" size="sm">
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm">
                        <Share2 className="w-4 h-4 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}