import React, { useState } from "react";
import BaseURL from "./Api";

const claimTypes = ["IFR", "CR", "CFR"];
const maxFileSizeMB = 10;

export default function ImprovedClaimForm() {
  const [form, setForm] = useState({
    claimantName: "",
    villageName: "",
    district: "",
    state: "",
    claimType: "IFR",
    claimedArea: "",
    locationJson: "",
  });

  const [socioForm, setSocioForm] = useState({
    annualIncome: "",
    hasPuccaHouse: false,
    isEmployedInGovt: false,
    hasRationCard: false,
    isStudent: false,
    lastExamPercentage: "",
    hasOtherScholarship: false,
    familySize: "",
    age: "",
  });

  const [files, setFiles] = useState({
    incomeCertificate: null,
    casteCertificate: null,
    idProof: null,
    landDocument: null,
    otherDocs: [],
  });

  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [createdClaim, setCreatedClaim] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  function handleSocioChange(e) {
    const { name, value, type, checked } = e.target;
    setSocioForm((s) => ({
      ...s,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleFileChange(e) {
    const { name, files: fileList } = e.target;
    if (!fileList) return;

    if (name === "otherDocs") {
      const arr = Array.from(fileList);
      setFiles((f) => ({ ...f, otherDocs: arr }));
      return;
    }

    const file = fileList[0];

    if (file && file.size / 1024 / 1024 > maxFileSizeMB) {
      setErrors((prev) => [
        ...prev,
        `${file.name} exceeds ${maxFileSizeMB} MB limit.`,
      ]);
      return;
    }

    setFiles((f) => ({ ...f, [name]: file }));
  }

  function validateForm() {
    const e = [];
    if (!form.claimantName.trim()) e.push("Claimant name is required.");
    if (!form.villageName.trim()) e.push("Village name is required.");
    if (!form.district.trim()) e.push("District is required.");
    if (!form.state.trim()) e.push("State is required.");
    if (!form.claimType) e.push("Claim type is required.");

    if (!socioForm.annualIncome || socioForm.annualIncome <= 0) {
      e.push("Annual income is required.");
    }
    if (!socioForm.age || socioForm.age < 18) {
      e.push("Age must be 18 or above.");
    }

    if (form.locationJson.trim()) {
      try {
        const parsed = JSON.parse(form.locationJson);
        if (!Array.isArray(parsed)) e.push("Location JSON must be an array of coordinates.");
      } catch (err) {
        e.push("Location JSON is not valid JSON.");
      }
    }
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setSuccessMsg(null);

    const v = validateForm();
    if (v.length > 0) {
      setErrors(v);
      return;
    }

    setSubmitting(true);

    try {
      const claimPayload = {
        claimantName: form.claimantName,
        villageName: form.villageName,
        district: form.district,
        state: form.state,
        claimType: form.claimType,
        status: "PENDING",
        claimedArea: form.claimedArea ? Number(form.claimedArea) : null,
        location: null,
      };

      if (form.locationJson.trim()) {
        try {
          const parsed = JSON.parse(form.locationJson);
          if (parsed.type && parsed.coordinates) {
            claimPayload.location = parsed;
          } else if (Array.isArray(parsed)) {
            claimPayload.location = {
              type: "Polygon",
              coordinates: [parsed],
            };
          }
        } catch (err) {}
      }

      const URLC = `${BaseURL}/api/v1/claims/claim`;
      const token = localStorage.getItem("token");

      const resp = await fetch(URLC, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(claimPayload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to create claim: ${text || resp.status}`);
      }

      const created = await resp.json();
      setCreatedClaim(created);

      const socioPayload = {
        name: form.claimantName,
        claimId: created._id,
        annualIncome: Number(socioForm.annualIncome),
        hasPuccaHouse: socioForm.hasPuccaHouse,
        isEmployedInGovt: socioForm.isEmployedInGovt,
        hasRationCard: socioForm.hasRationCard,
        isStudent: socioForm.isStudent,
        lastExamPercentage: socioForm.lastExamPercentage
          ? Number(socioForm.lastExamPercentage)
          : null,
        hasOtherScholarship: socioForm.hasOtherScholarship,
        familySize: socioForm.familySize ? Number(socioForm.familySize) : null,
        age: Number(socioForm.age),
      };

      const socioResp = await fetch(`${BaseURL}/api/v1/socio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(socioPayload),
      });

      if (!socioResp.ok) {
        console.error("Failed to create socioeconomic record");
      }

      const hasAnyFile =
        files.incomeCertificate ||
        files.casteCertificate ||
        files.idProof ||
        files.landDocument ||
        (files.otherDocs && files.otherDocs.length > 0);

      if (hasAnyFile) {
        const fd = new FormData();
        if (files.incomeCertificate) fd.append("incomeCertificate", files.incomeCertificate);
        if (files.casteCertificate) fd.append("casteCertificate", files.casteCertificate);
        if (files.idProof) fd.append("idProof", files.idProof);
        if (files.landDocument) fd.append("landDocument", files.landDocument);
        if (files.otherDocs && files.otherDocs.length > 0) {
          files.otherDocs.forEach((f, i) => fd.append("otherDocs", f));
        }

        const URLD = `${BaseURL}/api/v1/claims/${created._id}/documents`;

        const upResp = await fetch(URLD, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: fd,
        });

        if (!upResp.ok) {
          const txt = await upResp.text();
          setErrors([
            `Claim created (id ${created._id}) but uploading documents failed: ${txt || upResp.status}`,
          ]);
          setSubmitting(false);
          return;
        }
      }

      setSuccessMsg(`Claim created successfully (ID: ${created._id}). Documents uploaded.`);

      // Reset form
      setForm({
        claimantName: "",
        villageName: "",
        district: "",
        state: "",
        claimType: "IFR",
        claimedArea: "",
        locationJson: "",
      });

      setSocioForm({
        annualIncome: "",
        hasPuccaHouse: false,
        isEmployedInGovt: false,
        hasRationCard: false,
        isStudent: false,
        lastExamPercentage: "",
        hasOtherScholarship: false,
        familySize: "",
        age: "",
      });

      setFiles({
        incomeCertificate: null,
        casteCertificate: null,
        idProof: null,
        landDocument: null,
        otherDocs: [],
      });
    } catch (err) {
      console.error(err);
      setErrors([err.message || "Unknown error"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">


        <div className="bg-linear-to-r from-green-600 to-blue-600 rounded-3xl shadow-2xl p-8 mb-8 text-white">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">New Claim Submission</h1>
              <p className="text-green-100 text-lg">Fill in the details below to register your forest rights claim</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">


          <div className="bg-linear-to-r from-green-50 to-blue-50 px-8 py-6 border-b">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <span className="font-medium text-gray-700">Basic Info</span>
              </div>
              <div className="flex-1 h-1 bg-gray-200 mx-2"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <span className="font-medium text-gray-700">Socio-Economic</span>
              </div>
              <div className="flex-1 h-1 bg-gray-200 mx-2"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <span className="font-medium text-gray-700">Documents</span>
              </div>
            </div>
          </div>

          <div className="p-8">


            {errors.length > 0 && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-r-xl p-5 shadow-md animate-slideIn">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-800 text-lg mb-2">Please fix the following errors:</h3>
                    <ul className="space-y-1">
                      {errors.map((err, i) => (
                        <li key={i} className="text-red-700 text-sm flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}



            {successMsg && (
              <div className="mb-6 bg-green-50 border-l-4 border-green-500 rounded-r-xl p-5 shadow-md animate-slideIn">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="font-bold text-green-800 text-lg">{successMsg}</h3>
                    {createdClaim && (
                      <p className="text-green-700 text-sm mt-1">
                        Claim ID: <strong>{createdClaim._id}</strong> • {createdClaim.villageName}, {createdClaim.district}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">

{/* step-1 */}

              <div className="bg-linear-to-br from-gray-50 to-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Basic Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Claimant Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="claimantName"
                      value={form.claimantName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Village Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="villageName"
                      value={form.villageName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                      placeholder="Enter village"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      District <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="district"
                      value={form.district}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                      placeholder="Enter district"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                      placeholder="Enter state"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Claim Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="claimType"
                      value={form.claimType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                    >
                      {claimTypes.map((ct) => (
                        <option key={ct} value={ct}>
                          {ct}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Claimed Area (hectares)
                    </label>
                    <input
                      name="claimedArea"
                      type="number"
                      step="0.0001"
                      value={form.claimedArea}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Location Coordinates (Optional)
                  </label>
                  <textarea
                    name="locationJson"
                    value={form.locationJson}
                    onChange={handleChange}
                    rows={3}
                    placeholder='Paste GeoJSON coordinates'
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none font-mono text-sm"
                  />
                </div>
              </div>

{/* step-2 */}

              <div className="bg-linear-to-br from-blue-50 to-white rounded-2xl p-6 border-2 border-blue-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Socio-Economic Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Annual Income (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="annualIncome"
                      type="number"
                      value={socioForm.annualIncome}
                      onChange={handleSocioChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      placeholder="e.g., 120000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Age <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="age"
                      type="number"
                      value={socioForm.age}
                      onChange={handleSocioChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      placeholder="18+"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Family Size
                    </label>
                    <input
                      name="familySize"
                      type="number"
                      value={socioForm.familySize}
                      onChange={handleSocioChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                      placeholder="Number of members"
                    />
                  </div>

                  {socioForm.isStudent && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Last Exam Percentage
                      </label>
                      <input
                        name="lastExamPercentage"
                        type="number"
                        step="0.01"
                        value={socioForm.lastExamPercentage}
                        onChange={handleSocioChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                        placeholder="e.g., 75.5"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl p-5 border-2 border-blue-100">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Eligibility Indicators
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: "hasPuccaHouse", label: "Has Pucca House" },
                      { name: "isEmployedInGovt", label: "Employed in Government" },
                      { name: "hasRationCard", label: "Has Ration Card" },
                      { name: "isStudent", label: "Currently a Student" },
                    ].map((checkbox) => (
                      <label key={checkbox.name} className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg hover:bg-blue-50 transition-colors">
                        <input
                          type="checkbox"
                          name={checkbox.name}
                          checked={socioForm[checkbox.name]}
                          onChange={handleSocioChange}
                          className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                          {checkbox.label}
                        </span>
                      </label>
                    ))}

                    {socioForm.isStudent && (
                      <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg hover:bg-blue-50 transition-colors">
                        <input
                          type="checkbox"
                          name="hasOtherScholarship"
                          checked={socioForm.hasOtherScholarship}
                          onChange={handleSocioChange}
                          className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                          Has Other Scholarship
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              </div>


{/* step-4 */}

              <div className="bg-linear-to-br from-purple-50 to-white rounded-2xl p-6 border-2 border-purple-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Supporting Documents</h2>
                    <p className="text-sm text-gray-600 mt-1">Max {maxFileSizeMB} MB per file • PDF, JPG, PNG accepted</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "incomeCertificate", label: "Income Certificate (आय प्रमाण पत्र)" },
                    { name: "casteCertificate", label: "Caste Certificate" },
                    { name: "idProof", label: "Identity Proof (Aadhaar/Voter)" },
                    { name: "landDocument", label: "Land Documents" },
                  ].map((doc) => (
                    <div key={doc.name} className="bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 transition-all">
                      <label className="cursor-pointer">
                        <span className="block text-sm font-semibold text-gray-700 mb-2">
                          {doc.label}
                        </span>
                        <div className="relative">
                          <input
                            type="file"
                            name={doc.name}
                            accept=".pdf,image/*"
                            onChange={handleFileChange}
                            className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                          />
                        </div>
                        {files[doc.name] && (
                          <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {files[doc.name].name}
                          </p>
                        )}
                      </label>
                    </div>
                  ))}
                </div>

                <div className="mt-4 bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 transition-all">
                  <label className="cursor-pointer">
                    <span className="block text-sm font-semibold text-gray-700 mb-2">
                      Other Documents (Multiple files allowed)
                    </span>
                    <input
                      type="file"
                      name="otherDocs"
                      accept=".pdf,image/*"
                      multiple
                      onChange={handleFileChange}
                      className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                    />
                    {files.otherDocs?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {files.otherDocs.map((file, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                            <span className="text-xs text-gray-700">{file.name}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setFiles((f) => ({
                                  ...f,
                                  otherDocs: f.otherDocs.filter((_, idx) => idx !== i),
                                }))
                              }
                              className="text-xs text-red-600 hover:text-red-800 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t-2">
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 sm:flex-none px-8 py-4 bg-linear-to-r from-green-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 transition-all font-semibold text-lg"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Submitting...
                      </span>
                    ) : (
                      "Submit Claim"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForm({
                        claimantName: "",
                        villageName: "",
                        district: "",
                        state: "",
                        claimType: "IFR",
                        claimedArea: "",
                        locationJson: "",
                      });
                      setSocioForm({
                        annualIncome: "",
                        hasPuccaHouse: false,
                        isEmployedInGovt: false,
                        hasRationCard: false,
                        isStudent: false,
                        lastExamPercentage: "",
                        hasOtherScholarship: false,
                        familySize: "",
                        age: "",
                      });
                      setFiles({
                        incomeCertificate: null,
                        casteCertificate: null,
                        idProof: null,
                        landDocument: null,
                        otherDocs: [],
                      });
                      setErrors([]);
                      setSuccessMsg(null);
                    }}
                    className="px-6 py-4 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold"
                  >
                    Reset Form
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      
    </div>
  );
}