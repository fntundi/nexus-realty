import React, { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, FeatureGroup } from 'react-leaflet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, X, Pencil } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Drawing Controls Component
function DrawingControls({ onAreaCreated, onAreaDeleted }) {
  const map = useMap();
  const featureGroupRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    featureGroupRef.current = drawnItems;

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        rectangle: true,
        circle: true,
        polygon: true,
        polyline: false,
        marker: false,
        circlemarker: false
      },
      edit: {
        featureGroup: drawnItems,
        edit: false,
        remove: true
      }
    });

    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;
      drawnItems.addLayer(layer);
      const geoJSON = layer.toGeoJSON();
      if (geoJSON.geometry.type === 'Polygon') {
        onAreaCreated(geoJSON.geometry.coordinates[0]);
      }
    });

    map.on(L.Draw.Event.DELETED, () => {
      onAreaDeleted();
    });

    return () => {
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
    };
  }, [map, onAreaCreated, onAreaDeleted]);

  return null;
}

function MapControls({ properties, onPropertyClick, customArea, onClearArea }) {
  const map = useMap();

  useEffect(() => {
    if (properties.length > 0) {
      const bounds = properties.map(p => [p.latitude || 30.2672, p.longitude || -97.7431]);
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [properties, map]);

  return null;
}

export default function MapSearchView({ properties, onPropertyClick, onAreaFilter }) {
  const [customArea, setCustomArea] = useState(null);

  const handleAreaCreated = (coordinates) => {
    setCustomArea(coordinates);
    
    // Filter properties within the drawn area
    const filteredIds = properties
      .filter(p => {
        if (!p.latitude || !p.longitude) return false;
        return isPointInPolygon([p.longitude, p.latitude], coordinates);
      })
      .map(p => p.id);
    
    onAreaFilter(filteredIds);
  };

  const handleAreaDeleted = () => {
    setCustomArea(null);
    onAreaFilter(null);
  };

  const isPointInPolygon = (point, polygon) => {
    const x = point[0], y = point[1];
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      
      const intersect = ((yi > y) !== (yj > y)) && 
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  };

  const clearCustomArea = () => {
    setCustomArea(null);
    onAreaFilter(null);
  };

  return (
    <div className="relative h-full">
      {customArea && (
        <div className="absolute top-4 left-4 z-[1000]">
          <Card className="p-3 shadow-lg">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Custom Area Active</p>
                <p className="text-xs text-slate-600">
                  Showing properties in drawn area
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={clearCustomArea}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      <MapContainer
        center={[30.2672, -97.7431]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        <DrawingControls 
          onAreaCreated={handleAreaCreated}
          onAreaDeleted={handleAreaDeleted}
        />

        {properties.map(property => (
          <Marker
            key={property.id}
            position={[property.latitude || 30.2672, property.longitude || -97.7431]}
            eventHandlers={{
              click: () => onPropertyClick(property)
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm mb-1">{property.address}</h3>
                <p className="text-xs text-slate-600 mb-2">
                  {property.city}, {property.state}
                </p>
                <Badge className="bg-blue-600 text-white text-xs">
                  ${property.price?.toLocaleString()}
                </Badge>
                <div className="flex gap-2 mt-2 text-xs text-slate-600">
                  {property.bedrooms && <span>{property.bedrooms} bed</span>}
                  {property.bathrooms && <span>• {property.bathrooms} bath</span>}
                  {property.square_feet && <span>• {property.square_feet.toLocaleString()} sqft</span>}
                </div>
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => onPropertyClick(property)}
                >
                  View Details
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapControls 
          properties={properties} 
          onPropertyClick={onPropertyClick}
          customArea={customArea}
          onClearArea={clearCustomArea}
        />
      </MapContainer>
    </div>
  );
}