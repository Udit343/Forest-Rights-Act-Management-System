import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import BaseURL from "./Api";

const FitBoundsHandler = ({ geoJsonData }) => {
  const map = useMap();

  useEffect(() => {
    if (Array.isArray(geoJsonData) && geoJsonData.length > 0) {
      const featureCollection = {
        type: "FeatureCollection",
        features: geoJsonData
          .filter((c) => c.location?.type === "Polygon")
          .map((c) => ({
            type: "Feature",
            geometry: c.location,
            properties: c,
          })),
      };

      const layer = new L.GeoJSON(featureCollection);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [geoJsonData, map]);

  return null;
};

const ImprovedFRAAtlasMap = () => {
  const [claims, setClaims] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0, rejected: 0 });

  useEffect(() => {
    setLoading(true);
    fetch(`${BaseURL}/api/v1/claims`)
      .then((res) => res.json())
      .then((data) => {

        setClaims(data);
        
        // Calculate stats

        const total = data.length;
        const pending = data.filter(c => c.status === "PENDING").length;
        const verified = data.filter(c => c.status === "VERIFIED").length;
        const rejected = data.filter(c => c.status === "REJECTED").length;
        setStats({ total, pending, verified, rejected });
        
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching claims:", err);
        setLoading(false);
      });
  }, []);

  const getClaimStyle = (feature) => {
    const status = feature.properties.status;
    
    const styles = {
      VERIFIED: {
        color: "#10b981",
        fillColor: "#d1fae5",
        weight: 2,
        fillOpacity: 0.6,
      },
      PENDING: {
        color: "#f59e0b",
        fillColor: "#fef3c7",
        weight: 2,
        fillOpacity: 0.6,
      },
      REJECTED: {
        color: "#ef4444",
        fillColor: "#fee2e2",
        weight: 2,
        fillOpacity: 0.6,
      },
    };

    return styles[status] || styles.PENDING;
  };

  const onEachClaim = (feature, layer) => {
    const props = feature.properties;
    
    const statusColors = {
      VERIFIED: '#10b981',
      REJECTED: '#ef4444'
    };
    
    const statusColor = statusColors[props.status] || '#6b7280';

    layer.bindPopup(
      `<div style="font-family: sans-serif; min-width: 280px;">
        <div style="background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); color: white; padding: 12px; margin: -15px -20px 12px -20px; border-radius: 12px 12px 0 0;">
          <h3 style="margin: 0; font-size: 16px; font-weight: bold;">${props.claimantName || "Unknown"}</h3>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Claim ID: ${props._id?.substring(0, 8)}...</p>
        </div>
        <div style="font-size: 13px; line-height: 1.8; color: #374151;">
          <div style="margin-bottom: 8px;">
            <strong style="color: #6b7280;"> Location</strong>
            <p style="margin: 2px 0 0 0;">${props.villageName || "N/A"}, ${props.district || "N/A"}</p>
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #6b7280;"> Status</strong>
            <p style="margin: 2px 0 0 0;">
              <span style="background: ${statusColor}22; color: ${statusColor}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                ${props.status || "PENDING"}
              </span>
            </p>
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #6b7280;">Claim Type</strong>
            <p style="margin: 2px 0 0 0;">${props.claimType || "N/A"}</p>
          </div>
        </div>
      </div>`,
      { maxWidth: 320 }
    );
  };

  const filteredClaims = claims?.filter((c) => {
    const matchesFilter = filter === "all" || c.status?.toUpperCase() === filter.toUpperCase();
    const matchesSearch = !searchTerm || 
      c.claimantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.villageName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.district?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch && c.location?.type === "Polygon";
  }) || [];

  return (
    <div className="flex flex-col h-screen bg-linear-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-green-500">
        <div className="container mx-auto px-6 py-5">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-linear-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  FRA Atlas Map
                </h1>
                <p className="text-gray-600 text-sm mt-1">Forest Rights Act Claims Visualization</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search claims..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500  outline-none w-64"
                />
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-linear-to-br from-blue-50 to-blue-100 p-4 rounded-2xl border-2 border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-blue-700">{stats.total}</div>
                  <div className="text-xs text-blue-600 font-medium mt-1">Total Claims</div>
                </div>
              </div>
            </div>

            <div className="bg-linear-to-br from-yellow-50 to-yellow-100 p-4 rounded-2xl border-2 border-yellow-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-yellow-700">{stats.pending}</div>
                  <div className="text-xs text-yellow-600 font-medium mt-1">Pending</div>
                </div>
              </div>
            </div>

            <div className="bg-linear-to-br from-green-50 to-green-100 p-4 rounded-2xl border-2 border-green-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-green-700">{stats.verified}</div>
                  <div className="text-xs text-green-600 font-medium mt-1">Verified</div>
                </div>
              </div>
            </div>

            <div className="bg-linear-to-br from-red-50 to-red-100 p-4 rounded-2xl border-2 border-red-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-red-700">{stats.rejected}</div>
                  <div className="text-xs text-red-600 font-medium mt-1">Rejected</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Map */}

      <main className="flex-1 p-6 relative">
        {loading ? (
          <div className="h-full bg-white rounded-3xl shadow-2xl flex items-center justify-center">
            <div className="text-center">
              <p className="text-xl text-gray-600 font-semibold">Loading FRA Atlas...</p>
              <p className="text-sm text-gray-400 mt-2">Please wait while we fetch the claims data</p>
            </div>
          </div>
        ) : (
          <div className="h-full bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-gray-100">
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {filteredClaims.length > 0 && (
                <>
                  <GeoJSON
                    data={{
                      type: "FeatureCollection",
                      features: filteredClaims.map((c) => ({
                        type: "Feature",
                        geometry: c.location,
                        properties: c,
                      })),
                    }}
                    style={getClaimStyle}
                    onEachFeature={onEachClaim}
                  />
                  <FitBoundsHandler geoJsonData={filteredClaims} />
                </>
              )}
            </MapContainer>


            {/* Results Count */}
            {searchTerm && (
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-xl px-5 py-3 z-10">
                <p className="text-sm text-gray-700">
                  Found <strong className="text-green-600">{filteredClaims.length}</strong> claims matching "{searchTerm}"
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ImprovedFRAAtlasMap;