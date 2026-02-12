import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Loader } from 'lucide-react';

export default function VirtualStagingViewer({ property, stagingImages = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!stagingImages || stagingImages.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-500">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p>No virtual staging available for this property</p>
        </CardContent>
      </Card>
    );
  }

  const currentStaging = stagingImages[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < stagingImages.length - 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Virtual Staging Preview</CardTitle>
          <Badge variant="outline">{currentStaging.room_name}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Image */}
        <div className="relative bg-gray-100 rounded-lg overflow-hidden h-96">
          {currentStaging.generation_status === 'processing' ? (
            <div className="w-full h-full flex items-center justify-center gap-2 text-slate-500">
              <Loader className="w-5 h-5 animate-spin" />
              Generating staged version...
            </div>
          ) : currentStaging.staged_image_url ? (
            <img
              src={currentStaging.staged_image_url}
              alt="Virtually staged room"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              Failed to load staging
            </div>
          )}
        </div>

        {/* Before/After Comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-slate-600 font-medium">Original</p>
            <div className="bg-gray-100 rounded-lg overflow-hidden h-32">
              <img
                src={currentStaging.original_image_url}
                alt="Original room"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-600 font-medium">Staged</p>
            <div className="bg-gray-100 rounded-lg overflow-hidden h-32">
              <img
                src={currentStaging.staged_image_url}
                alt="Staged room"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Style Badge */}
        <div className="flex items-center justify-between pt-2">
          <Badge variant="secondary">
            {currentStaging.staging_style.replace(/_/g, ' ')}
          </Badge>
          <span className="text-xs text-slate-500">
            {currentIndex + 1} of {stagingImages.length}
          </span>
        </div>

        {/* Navigation */}
        {stagingImages.length > 1 && (
          <div className="flex gap-2 justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrevious}
              onClick={() => setCurrentIndex(currentIndex - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => setCurrentIndex(currentIndex + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}