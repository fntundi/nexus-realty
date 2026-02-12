import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Map, Plus, Save, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    }
  });
  return null;
}

export default function TerritoryManager() {
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState([]);
  
  const [newTerritory, setNewTerritory] = useState({
    type: 'neighborhood',
    name: '',
    value: ''
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list()
  });

  const updateAgentMutation = useMutation({
    mutationFn: async ({ agentId, territories }) => {
      return base44.entities.Agent.update(agentId, { territory_definitions: territories });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Territories updated');
      setAddDialogOpen(false);
      setDrawingMode(false);
      setPolygonPoints([]);
      setNewTerritory({ type: 'neighborhood', name: '', value: '' });
    }
  });

  const handleMapClick = (latlng) => {
    if (drawingMode) {
      setPolygonPoints([...polygonPoints, [latlng.lat, latlng.lng]]);
    }
  };

  const handleAddTerritory = () => {
    if (!selectedAgent || !newTerritory.name || !newTerritory.value) {
      toast.error('Please fill in all fields');
      return;
    }

    const currentTerritories = selectedAgent.territory_definitions || [];
    const updatedTerritories = [
      ...currentTerritories,
      {
        ...newTerritory,
        coordinates: polygonPoints.length > 2 ? polygonPoints : null
      }
    ];

    updateAgentMutation.mutate({
      agentId: selectedAgent.id,
      territories: updatedTerritories
    });
  };

  const handleRemoveTerritory = (territoryIndex) => {
    const currentTerritories = selectedAgent.territory_definitions || [];
    const updatedTerritories = currentTerritories.filter((_, idx) => idx !== territoryIndex);
    
    updateAgentMutation.mutate({
      agentId: selectedAgent.id,
      territories: updatedTerritories
    });
  };

  const getAgentMarket = (marketId) => {
    return markets.find(m => m.id === marketId);
  };

  const getMarketCenter = (marketId) => {
    const market = getAgentMarket(marketId);
    // Default center coordinates (could be enhanced with actual market coordinates)
    const stateCoords = {
      'TX': [30.2672, -97.7431], // Austin
      'AZ': [33.4484, -112.0740], // Phoenix
      'CA': [34.0522, -118.2437] // LA
    };
    return stateCoords[market?.state] || [39.8283, -98.5795]; // US center
  };

  const colorByType = {
    zip_code: '#3b82f6',
    neighborhood: '#10b981',
    school_district: '#f59e0b',
    custom_area: '#8b5cf6'
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Territory Manager</h1>
            <p className="text-slate-600 mt-1">Define and manage agent territories</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Agents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {agents.map(agent => {
                const market = getAgentMarket(agent.market_id);
                const territoryCount = agent.territory_definitions?.length || 0;
                
                return (
                  <div
                    key={agent.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedAgent?.id === agent.id 
                        ? 'bg-blue-50 border-2 border-blue-500' 
                        : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                    }`}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <div className="font-medium text-slate-900">{agent.user_email}</div>
                    <div className="text-sm text-slate-600 mt-1">
                      {market?.name} • {territoryCount} territories
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Map className="w-5 h-5" />
                  {selectedAgent ? `${selectedAgent.user_email}'s Territories` : 'Select an Agent'}
                </CardTitle>
                {selectedAgent && (
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Territory
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedAgent ? (
                <div className="space-y-4">
                  <div className="h-[400px] rounded-lg overflow-hidden border border-slate-200">
                    <MapContainer
                      center={getMarketCenter(selectedAgent.market_id)}
                      zoom={10}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      
                      {selectedAgent.territory_definitions?.map((territory, idx) => {
                        if (territory.coordinates && territory.coordinates.length > 2) {
                          return (
                            <Polygon
                              key={idx}
                              positions={territory.coordinates}
                              pathOptions={{
                                color: colorByType[territory.type],
                                fillColor: colorByType[territory.type],
                                fillOpacity: 0.2
                              }}
                            >
                              <Popup>
                                <div className="p-2">
                                  <div className="font-medium">{territory.name}</div>
                                  <div className="text-sm text-slate-600">{territory.type.replace(/_/g, ' ')}</div>
                                </div>
                              </Popup>
                            </Polygon>
                          );
                        }
                        return null;
                      })}
                    </MapContainer>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-900">Assigned Territories</h3>
                    {selectedAgent.territory_definitions?.length > 0 ? (
                      selectedAgent.territory_definitions.map((territory, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{territory.name}</div>
                            <div className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                              <Badge style={{ backgroundColor: colorByType[territory.type] }}>
                                {territory.type.replace(/_/g, ' ')}
                              </Badge>
                              <span>{territory.value}</span>
                              {territory.coordinates && (
                                <span className="text-xs">• {territory.coordinates.length} points</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTerritory(idx)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-500">
                        No territories defined yet
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  Select an agent to manage their territories
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Territory</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Territory Type</Label>
                  <Select value={newTerritory.type} onValueChange={(v) => setNewTerritory({...newTerritory, type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zip_code">Zip Code</SelectItem>
                      <SelectItem value="neighborhood">Neighborhood</SelectItem>
                      <SelectItem value="school_district">School District</SelectItem>
                      <SelectItem value="custom_area">Custom Area</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Territory Name</Label>
                  <Input
                    placeholder="e.g., Downtown Austin"
                    value={newTerritory.name}
                    onChange={(e) => setNewTerritory({...newTerritory, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Value/Identifier</Label>
                  <Input
                    placeholder="e.g., 78701 or Downtown"
                    value={newTerritory.value}
                    onChange={(e) => setNewTerritory({...newTerritory, value: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Geographic Boundary (Optional)</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={drawingMode ? "default" : "outline"}
                      onClick={() => setDrawingMode(!drawingMode)}
                    >
                      {drawingMode ? 'Drawing...' : 'Draw on Map'}
                    </Button>
                    {polygonPoints.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPolygonPoints([])}
                      >
                        Clear ({polygonPoints.length} points)
                      </Button>
                    )}
                  </div>
                </div>
                <div className="h-[300px] rounded-lg overflow-hidden border border-slate-200">
                  <MapContainer
                    center={getMarketCenter(selectedAgent?.market_id)}
                    zoom={11}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap'
                    />
                    <MapClickHandler onMapClick={handleMapClick} />
                    
                    {polygonPoints.map((point, idx) => (
                      <Marker key={idx} position={point} />
                    ))}
                    
                    {polygonPoints.length > 2 && (
                      <Polygon
                        positions={polygonPoints}
                        pathOptions={{
                          color: colorByType[newTerritory.type],
                          fillColor: colorByType[newTerritory.type],
                          fillOpacity: 0.2
                        }}
                      />
                    )}
                  </MapContainer>
                </div>
                {drawingMode && (
                  <p className="text-xs text-slate-600">Click on the map to add boundary points. Need at least 3 points to create an area.</p>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => {
                  setAddDialogOpen(false);
                  setDrawingMode(false);
                  setPolygonPoints([]);
                  setNewTerritory({ type: 'neighborhood', name: '', value: '' });
                }}>
                  Cancel
                </Button>
                <Button onClick={handleAddTerritory} disabled={updateAgentMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {updateAgentMutation.isPending ? 'Saving...' : 'Add Territory'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}