import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, FeatureGroup, GeoJSON } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import * as turf from "@turf/turf";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import BaseURL from "./Api";

export default function ImprovedPolygonAllocator() {
  const [pendingClaims, setPendingClaims] = useState([]);
  const [verifiedClaims, setVerifiedClaims] = useState([]);
  const [pattas, setPattas] = useState([]);
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [villageFilter, setVillageFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const featureGroupRef = useRef();

  useEffect(() => {
    const loadClaimsAndPattas = async () => {
      setLoading(true);
      try {
        const [claimsRes, pattasRes] = await Promise.all([
          fetch(`${BaseURL}/api/v1/claims`),
          fetch(`${BaseURL}/api/v1/pattas`),
        ]);
        if (!claimsRes.ok || !pattasRes.ok) throw new Error("Cannot fetch data");
        const claims = await claimsRes.json();
        const pattasData = await pattasRes.json();

        setPendingClaims(claims.filter((c) => c.status === "PENDING" || c.status === 0));
        setVerifiedClaims(
          claims.filter(
            (c) =>
              (c.status === "VERIFIED" || c.status === 1) &&
              c.location &&
              c.location.type === "Polygon"
          )
        );
        setPattas(pattasData);
      } catch (err) {
        console.error(err);
        alert("Failed to load claims or pattas");
      } finally {
        setLoading(false);
      }
    };
    loadClaimsAndPattas();
  }, []);

  const handleCreated = async (e) => {
    if (!selectedClaimId) {
      alert(" Please select a claim before drawing");
      return;
    }

    const layer = e.layer;
    const latlngs = layer.getLatLngs()[0];

    let coords = latlngs.map((pt) => [pt.lng, pt.lat]);
    if (
      coords.length &&
      (coords[0][0] !== coords[coords.length - 1][0] ||
        coords[0][1] !== coords[coords.length - 1][1])
    ) {
      coords.push(coords[0]);
    }

    try {
      const resp = await fetch(
        `${BaseURL}/api/v1/claims/${selectedClaimId}/polygon`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(coords),
        }
      );
      if (!resp.ok) {
  const data = await resp.json();
  throw new Error(data.message);
}
      const updated = await resp.json();

      const poly = turf.polygon([coords]);
      const areaHectares = turf.area(poly) / 10_000;

      const pattaBody = {
        pattaNumber: `${updated.district}-${updated.villageName}-${updated._id}`,
        issueDate: new Date().toISOString().split("T")[0],
        grantedArea: Number(areaHectares.toFixed(4)),
        claimId: updated._id,
      };

      const pattaResp = await fetch(`${BaseURL}/api/v1/pattas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pattaBody),
      });
      if (!pattaResp.ok) throw new Error("Failed to create FraPatta");
      const pattaSaved = await pattaResp.json();

      alert(
        ` FraPatta Created!\n\nPatta ID: ${pattaSaved._id}\nArea: ${areaHectares.toFixed(2)} hectares`
      );
      
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(" Error: " + err.message);
    }
  };

  const verifiedGeoJson = {
    type: "FeatureCollection",
    features: verifiedClaims.map((c) => {
      const patta = pattas.find((p) => p.claimId === c._id);
      return {
        type: "Feature",
        geometry: c.location,
        properties: {
          claimantName: c.claimantName,
          villageName: c.villageName,
          district: c.district,
          pattaNumber: patta?.pattaNumber || "N/A",
          holderName: patta?.holderName || c.claimantName || "N/A",
          grantedArea: patta?.grantedArea || "N/A",
          issueDate: patta?.issueDate || "N/A",
        },
      };
    }),
  };

  function onEachFeature(feature, layer) {
    const props = feature.properties;
    layer.bindPopup(
      `<div style="font-family: sans-serif; min-width: 250px;">
        <h3 style="margin: 0 0 12px 0; color: #047857; font-size: 16px; font-weight: bold; border-bottom: 2px solid #10b981; padding-bottom: 8px;">
        Verified Patta
        </h3>
        <div style="font-size: 13px; line-height: 1.8;">
          <p style="margin: 6px 0;"><strong>Patta Number:</strong> ${props.pattaNumber}</p>
          <p style="margin: 6px 0;"><strong>Holder:</strong> ${props.holderName}</p>
          <p style="margin: 6px 0;"><strong>Granted Area:</strong> <span style="color: #059669; font-weight: bold;">${props.grantedArea} ha</span></p>
          <p style="margin: 6px 0;"><strong>Issue Date:</strong> ${props.issueDate}</p>
          <p style="margin: 6px 0;"><strong>Village:</strong> ${props.villageName}</p>
          <p style="margin: 6px 0;"><strong>District:</strong> ${props.district}</p>
        </div>
      </div>`
    );
  }

  const villageNames = Array.from(new Set(pendingClaims.map((c) => c.villageName))).sort();

  const filteredClaims = villageFilter
    ? pendingClaims.filter((c) => c.villageName === villageFilter)
    : pendingClaims;

  const handleClaimSelect = (e) => {
    const claimId = e.target.value;
    setSelectedClaimId(claimId);
    const claim = pendingClaims.find(c => c._id === claimId);
    setSelectedClaim(claim);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-linear-to-br from-gray-50 to-blue-50">

      <div className="w-full lg:w-96 bg-white shadow-2xl overflow-y-auto">

        <div className="bg-linear-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold">Land Allocation</h1>
              <p className="text-blue-100 text-sm">Forest & Revenue Department</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-linear-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
              <div className="text-2xl font-bold text-orange-700">{pendingClaims.length}</div>
              <div className="text-xs text-orange-600 font-medium">Pending</div>
            </div>
            <div className="bg-linear-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <div className="text-2xl font-bold text-green-700">{verifiedClaims.length}</div>
              <div className="text-xs text-green-600 font-medium">Allocated</div>
            </div>
          </div>

          {/* Instructions Card */}
          <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">How to allocate land:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Select a village (optional filter)</li>
                  <li>Choose a pending claim</li>
                  <li>Draw polygon on map</li>
                  <li>Patta generated automatically</li>
                </ol>
              </div>
            </div>
          </div>


          <div className="bg-gray-50 rounded-2xl p-5 border-2 border-gray-200">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              Select Claim
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Filter by Village
                </label>
                <select
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none bg-white"
                  value={villageFilter}
                  onChange={(e) => setVillageFilter(e.target.value)}
                >
                  <option value="">All Villages</option>
                  {villageNames.map((village) => (
                    <option key={village} value={village}>
                      {village}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Choose Pending Claim
                </label>
                <select
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none bg-white"
                  value={selectedClaimId}
                  onChange={handleClaimSelect}
                >
                  <option value="">Select a claim...</option>
                  {filteredClaims.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.claimantName} ({c.villageName}, {c.district})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

{/* Selected Claim Details */}

          {selectedClaim && (
            <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border-2 border-green-200 animate-slideIn">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-green-800 mb-1">Selected Claim</h3>
                  <p className="text-sm text-green-700 mb-2">{selectedClaim.claimantName}</p>
                  <div className="space-y-1 text-xs text-green-600">
                    <p><strong>Village:</strong> {selectedClaim.villageName}</p>
                    <p><strong>District:</strong> {selectedClaim.district}</p>
                    <p><strong>Type:</strong> {selectedClaim.claimType}</p>
                    {selectedClaim.claimedArea && (
                      <p><strong>Claimed Area:</strong> {selectedClaim.claimedArea} ha</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                <p className="text-xs text-green-700 flex items-center gap-2">
                  <span>Use the polygon tool on the map to draw boundaries</span>
                </p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-sm text-gray-600">Loading claims...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={[28.7041, 77.1025]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri &mdash; Source: Esri, Maxar"
          />

          {verifiedGeoJson.features.length > 0 && (
            <GeoJSON
              data={verifiedGeoJson}
              style={{
                color: "#2563eb",
                fillColor: "#dbeafe",
                weight: 2,
                fillOpacity: 0.5,
              }}
              onEachFeature={onEachFeature}
            />
          )}

          <FeatureGroup ref={featureGroupRef}>
            <EditControl
              position="topright"
              onCreated={handleCreated}
              draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
                polygon: true,
              }}
            />
          </FeatureGroup>
        </MapContainer>


        {/* Map Legend */}
        <div className="absolute bottom-6 right-6 bg-white rounded-xl shadow-2xl p-4 z-10">
          <h4 className="font-bold text-gray-800 mb-3 text-sm">Legend</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white-200 border-2 border-blue-600 rounded"></div>
              <span>Allocated Land</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}