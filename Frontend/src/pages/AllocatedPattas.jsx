import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import BaseURL from "./Api";
import L from "leaflet";

export default function ImprovedAllocatedPattas() {
  const [pattas, setPattas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, totalArea: 0 });
  const [selectedPatta, setSelectedPatta] = useState(null);
  const mapRef = useRef();

  useEffect(() => {
    setLoading(true);
    fetch(`${BaseURL}/api/v1/pattas/geojson`)
      .then((res) => res.json())
      .then((data) => {
        setPattas(data);
        
        // Calculate stats
        const total = data.features?.length || 0;
        const totalArea = data.features?.reduce(
          (sum, f) => sum + (parseFloat(f.properties.grantedArea) || 0),
          0
        );
        setStats({ total, totalArea: totalArea.toFixed(2) });
        
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (pattas && mapRef.current) {
      const map = mapRef.current;
      const geoJsonLayer = L.geoJSON(pattas);
      if (geoJsonLayer.getBounds().isValid()) {
        map.fitBounds(geoJsonLayer.getBounds(), { padding: [50, 50] });
      }
    }
  }, [pattas]);

  const onEachFeature = (feature, layer) => {
    const props = feature.properties;
    
    // Enhanced popup with better styling
    layer.bindPopup(
      `<div style="font-family: sans-serif; min-width: 250px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 10px; margin: -15px -20px 10px -20px; border-radius: 8px 8px 0 0;">
          <h3 style="margin: 0; font-size: 15px; font-weight: bold;"> Patta Details</h3>
        </div>
        <div style="padding: 4px 0; font-size: 13px; line-height: 1.6; color: #374151;">
          <p style="margin: 6px 0;"><strong style="color: #6b7280;">Patta Number:</strong> ${props.pattaNumber || 'N/A'}</p>
          <p style="margin: 6px 0;"><strong style="color: #6b7280;">Holder:</strong> ${props.holderName || 'N/A'}</p>
          <p style="margin: 6px 0;"><strong style="color: #6b7280;">Granted Area:</strong> <span style="color: #10b981; font-weight: 600;">${props.grantedArea || 'N/A'} ha</span></p>
          <p style="margin: 6px 0;"><strong style="color: #6b7280;">Issue Date:</strong> ${props.issueDate || 'N/A'}</p>
          ${props.villageName ? `<p style="margin: 6px 0;"><strong style="color: #6b7280;">Village:</strong> ${props.villageName}</p>` : ''}
          ${props.district ? `<p style="margin: 6px 0;"><strong style="color: #6b7280;">District:</strong> ${props.district}</p>` : ''}
        </div>
      </div>`,
      { maxWidth: 300 }
    );

    // Hover effect
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 3,
          color: '#059669',
          fillOpacity: 0.7,
        });
        setSelectedPatta(props);
      },
      mouseout: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 2,
          color: '#10b981',
          fillOpacity: 0.5,
        });
        setSelectedPatta(null);
      },
    });
  };

  return (
    <div className="h-screen w-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Allocated Pattas</h1>
              <p className="text-sm text-gray-600">Forest Rights Land Allocation Map</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <div className="bg-green-50 px-6 py-3 rounded-xl border border-green-200">
              <div className="text-2xl font-bold text-green-700">{stats.total}</div>
              <div className="text-xs text-green-600 font-medium">Total Pattas</div>
            </div>
            <div className="bg-blue-50 px-6 py-3 rounded-xl border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">{stats.totalArea}</div>
              <div className="text-xs text-blue-600 font-medium">Total Area (ha)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 bg-white bg-opacity-90 flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-green-600 mx-auto mb-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600 font-medium">Loading allocated pattas...</p>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="h-[calc(100vh-200px)]">
        <MapContainer
          center={[20.7, 78.7]}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
          }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {pattas && (
            <GeoJSON
              data={pattas}
              style={{
                color: "#10b981",
                weight: 2,
                fillColor: "#d1fae5",
                fillOpacity: 0.5,
              }}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}