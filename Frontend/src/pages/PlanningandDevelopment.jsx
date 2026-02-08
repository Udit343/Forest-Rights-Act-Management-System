import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, FeatureGroup, GeoJSON } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import * as turf from "@turf/turf";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import BaseURL from "./Api";

export default function ImprovedPlanningDevelopment() {

  const [pendingClaims, setPendingClaims] = useState([]);
  const [verifiedClaims, setVerifiedClaims] = useState([]);
  const [pattas, setPattas] = useState([]);
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedVillage, setSelectedVillage] = useState("");
  const [selectedScheme, setSelectedScheme] = useState("");
  const [socioEconomic, setSocioEconomic] = useState([]);
  const [highlightedFeatures, setHighlightedFeatures] = useState([]);
  const [eligibleClaims, setEligibleClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const featureGroupRef = useRef();

  const schemes = [
    { value: "pmay", label: "PMAY (Pradhan Mantri Awas Yojana)", icon: "🏠", color: "yellow" },
    { value: "nrega", label: "MGNREGA (Rural Employment Guarantee)", icon: "💼", color: "green" },
    { value: "pds", label: "PDS (Public Distribution System)", icon: "🌾", color: "red" },
    { value: "scholarship", label: "Scholarship for Students", icon: "🎓", color: "blue" },
  ];

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

  useEffect(() => {
    fetch(`${BaseURL}/api/v1/socio`)
      .then((res) => res.json())
      .then((data) => setSocioEconomic(data))
      .catch(() => setSocioEconomic([]));
  }, []);

  const handleCreated = async (e) => {
    if (!selectedClaimId) {
      alert("⚠️ Please select a claim before drawing a polygon");
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
        const errorData = await resp.json();
        throw new Error(errorData.message);
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
        ` FraPatta Created Successfully!\n\nPatta ID: ${pattaSaved._id}\nArea: ${areaHectares.toFixed(2)} hectares`
      );
      
      // Refresh data
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(" Error: " + err.message);
    }
  };

  const handleSchemeChange = async (e) => {
    const scheme = e.target.value;
    setSelectedScheme(scheme);
    setHighlightedFeatures([]);
    setEligibleClaims([]);

    if (!scheme) return;

    setLoading(true);

    try {
      const socioRes = await fetch(`${BaseURL}/api/v1/socio`);
      const socioData = await socioRes.json();

      let eligibleSocioRecords = [];

      switch (scheme) {
        case "pmay":
          eligibleSocioRecords = socioData.filter(
            (s) => s.hasPuccaHouse === false && s.annualIncome < 300000 && s.age >= 18
          );
          break;

        case "nrega":
          eligibleSocioRecords = socioData.filter(
            (s) => s.isEmployedInGovt === false && s.age >= 18
          );
          break;

        case "pds":
          eligibleSocioRecords = socioData.filter((s) => s.hasRationCard === true);
          break;

        case "scholarship":
          eligibleSocioRecords = socioData.filter(
            (s) => s.isStudent === true && s.lastExamPercentage >= 50 && s.hasOtherScholarship === false
          );
          break;

        default:
          break;
      }

      const eligiblePattaIds = eligibleSocioRecords.map((s) => s.pattaId).filter(Boolean);

      const features = [];
      const eligibleClaimsList = [];

      for (const pattaId of eligiblePattaIds) {
        try {
          const pattaRes = await fetch(`${BaseURL}/api/v1/pattas/${pattaId}`);
          if (!pattaRes.ok) continue;
          const patta = await pattaRes.json();
          if (!patta.claimId) continue;

          const claimRes = await fetch(`${BaseURL}/api/v1/claims/${patta.claimId}`);
          if (!claimRes.ok) continue;
          const claim = await claimRes.json();
          if (!claim.location || claim.location.type !== "Polygon") continue;

          features.push({
            type: "Feature",
            geometry: claim.location,
            properties: {
              pattaNumber: patta.pattaNumber,
              grantedArea: patta.grantedArea,
              issueDate: patta.issueDate,
              claimantName: claim.claimantName,
              villageName: claim.villageName,
              district: claim.district,
              state: claim.state,
              scheme: scheme.toUpperCase(),
            },
          });

          eligibleClaimsList.push({
            claimantName: claim.claimantName,
            villageName: claim.villageName,
            district: claim.district,
            pattaNumber: patta.pattaNumber,
          });
        } catch (err) {
          console.error(err);
        }
      }

      setHighlightedFeatures(features);
      setEligibleClaims(eligibleClaimsList);
    } catch (err) {
      console.error("Failed to fetch eligibility:", err);
    } finally {
      setLoading(false);
    }
  };

  const verifiedGeoJson = {
    type: "FeatureCollection",
    features: verifiedClaims.map((c) => {
      const patta = pattas.find((p) => p.claimId === c._id);
      const socio = patta
        ? socioEconomic.find((s) => s.pattaId === patta._id || s.claimId === c._id)
        : null;

      const pmayEligible = socio
        ? socio.hasPuccaHouse === false && socio.annualIncome < 300000 && socio.age >= 18
        : false;

      return {
        type: "Feature",
        geometry: c.location,
        properties: {
          claimantName: c.claimantName,
          villageName: c.villageName,
          district: c.district,
          state: c.state,
          pattaNumber: patta?.pattaNumber || "N/A",
          holderName: c.claimantName || "N/A",
          grantedArea: patta?.grantedArea || "N/A",
          issueDate: patta?.issueDate || "N/A",
          pmayEligible: pmayEligible,
        },
      };
    }),
  };

  function onEachFeature(feature, layer) {
    const props = feature.properties;
    layer.bindPopup(
      `<div style="font-family: sans-serif;">
        <h3 style="margin: 0 0 10px 0; color: #047857; font-size: 16px; font-weight: bold;">Patta Details</h3>
        <div style="font-size: 13px; line-height: 1.6;">
          <p style="margin: 4px 0;"><strong>Patta Number:</strong> ${props.pattaNumber}</p>
          <p style="margin: 4px 0;"><strong>Holder:</strong> ${props.holderName}</p>
          <p style="margin: 4px 0;"><strong>Area:</strong> ${props.grantedArea} ha</p>
          <p style="margin: 4px 0;"><strong>Issue Date:</strong> ${props.issueDate}</p>
          <p style="margin: 4px 0;"><strong>Village:</strong> ${props.villageName}</p>
          <p style="margin: 4px 0;"><strong>District:</strong> ${props.district}</p>
          <p style="margin: 4px 0;"><strong>PMAY Eligible:</strong> <span style="color: ${props.pmayEligible ? '#10b981' : '#ef4444'}; font-weight: bold;">${props.pmayEligible ? ' Yes' : ' No'}</span></p>
        </div>
      </div>`
    );
  }

  const allDistricts = Array.from(new Set(pendingClaims.map((c) => c.district).filter(Boolean))).sort();
  const allVillages = Array.from(
    new Set(
      pendingClaims
        .filter((c) => !selectedDistrict || c.district === selectedDistrict)
        .map((c) => c.villageName)
        .filter(Boolean)
    )
  ).sort();

  const filteredClaims = pendingClaims.filter(
    (c) =>
      (!selectedDistrict || c.district === selectedDistrict) &&
      (!selectedVillage || c.villageName === selectedVillage)
  );

  const selectedSchemeDetails = schemes.find(s => s.value === selectedScheme);

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-linear-to-br from-gray-50 to-gray-100">

{/* Sidebar */}

      <div className="w-full lg:w-96 bg-white shadow-2xl overflow-y-auto">

{/* Header */}

        <div className="bg-linear-to-r from-green-600 to-blue-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold">Planning & Development</h1>
              <p className="text-green-100 text-sm">Manage claims and schemes</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">

{/* Stats Cards */}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-linear-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">{pendingClaims.length}</div>
              <div className="text-xs text-blue-600 font-medium">Pending Claims</div>
            </div>

            <div className="bg-linear-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <div className="text-2xl font-bold text-green-700">{verifiedClaims.length}</div>
              <div className="text-xs text-green-600 font-medium">Verified Claims</div>
            </div>
          </div>

{/* Filters Section */}

          <div className="bg-gray-50 rounded-2xl p-5 border-2 border-gray-200">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              Filter Claims
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  District
                </label>
                <select
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none bg-white"
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setSelectedVillage("");
                  }}
                >
                  <option value="">All Districts</option>
                  {allDistricts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Village
                </label>
                <select
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none bg-white disabled:bg-gray-100"
                  value={selectedVillage}
                  onChange={(e) => setSelectedVillage(e.target.value)}
                  disabled={!selectedDistrict}
                >
                  <option value="">All Villages</option>
                  {allVillages.map((village) => (
                    <option key={village} value={village}>
                      {village}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Claim
                </label>
                <select
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none bg-white"
                  value={selectedClaimId}
                  onChange={(e) => setSelectedClaimId(e.target.value)}
                >
                  <option value="">Choose a claim...</option>
                  {filteredClaims.map((claim, index) => (
                    <option key={`${claim._id}-${index}`} value={claim._id}>
                      {claim.claimantName} ({claim.villageName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedClaimId && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong> Claim selected.</strong> Draw a polygon on the map to allocate land.
                </p>
              </div>
            )}
          </div>


{/* Scheme Eligibility */}


          <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border-2 border-purple-200">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              Scheme Eligibility
            </h2>

            <select
              className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none bg-white"
              value={selectedScheme}
              onChange={handleSchemeChange}
            >
              <option value="">Select a scheme...</option>
              {schemes.map((scheme) => (
                <option key={scheme.value} value={scheme.value}>
                  {scheme.icon} {scheme.label}
                </option>
              ))}
            </select>

            {loading && selectedScheme && (
              <div className="mt-4 flex items-center gap-2 text-purple-600">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm">Checking eligibility...</span>
              </div>
            )}
          </div>


{/* Eligible Claims List */}


          {eligibleClaims.length > 0 && selectedSchemeDetails && (
            <div className="bg-white rounded-2xl p-5 border-2 border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{selectedSchemeDetails.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-800">Eligible for {selectedSchemeDetails.label.split('(')[0]}</h3>
                  <p className="text-xs text-gray-600">{eligibleClaims.length} claims found</p>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {eligibleClaims.map((claim, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-all">
                    <div className="font-semibold text-gray-800 text-sm">{claim.claimantName}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      <span className="inline-block mr-2"> {claim.villageName}</span>
                      <span className="inline-block">🏛️ {claim.district}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Patta: {claim.pattaNumber}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>


{/* Map Container */}


      <div className="flex-1 relative">
        {loading ? (
    <div className="flex items-center justify-center h-full text-gray-600 font-semibold">
      Loading Map...
    </div>
  ) : (
        <MapContainer
          center={[19.07, 82.03]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri &mdash; Source: Esri, Maxar"
          />

          {highlightedFeatures.length > 0 && (
            <GeoJSON
              data={{
                type: "FeatureCollection",
                features: highlightedFeatures,
              }}
              style={{
                color: "#eab308",
                fillColor: "#fde68a",
                weight: 3,
                fillOpacity: 0.6,
              }}
              onEachFeature={(feature, layer) => {
                const props = feature.properties;
                layer.bindPopup(
                  `<div style="font-family: sans-serif;">
                    <h3 style="margin: 0 0 10px 0; color: #ca8a04; font-size: 16px; font-weight: bold;">${props.scheme} Eligible</h3>
                    <div style="font-size: 13px; line-height: 1.6;">
                      <p style="margin: 4px 0;"><strong>Patta:</strong> ${props.pattaNumber}</p>
                      <p style="margin: 4px 0;"><strong>Area:</strong> ${props.grantedArea} ha</p>
                      <p style="margin: 4px 0;"><strong>Claimant:</strong> ${props.claimantName}</p>
                      <p style="margin: 4px 0;"><strong>Village:</strong> ${props.villageName}</p>
                    </div>
                  </div>`
                );
              }}
            />
          )}

          {verifiedGeoJson.features.length > 0 && (
            <GeoJSON
              data={verifiedGeoJson}
              style={(feature) => ({
                color: feature.properties.pmayEligible ? "#eab308" : "#ef4444",
                fillColor: feature.properties.pmayEligible ? "#fde68a" : "#fecaca",
                weight: 2,
                fillOpacity: 0.5,
              })}
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

            )}
{/* Map Legend */}


        <div className="absolute bottom-6 right-6 bg-white rounded-xl shadow-2xl p-4 z-10 max-w-xs">
          <h4 className="font-bold text-gray-800 mb-3 text-sm">Map Legend</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200 border-2 border-yellow-600 rounded"></div>
              <span>PMAY Eligible / Selected Scheme</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 border-2 border-red-600 rounded"></div>
              <span>Not Eligible</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}