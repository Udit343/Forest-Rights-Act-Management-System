import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ClaimForm from "./pages/ClaimForm";
import PlanningandDevelopment from "./pages/PlanningandDevelopment";
import PolygonAllocator from "./pages/ForestAndRevenue";
import AllocatedPattas from "./pages/AllocatedPattas";
import FRAAtlasMap from "./pages/FRAAtlasMap";
import "./App.css";

const logout = () => {
  localStorage.removeItem("token");
  window.location.href = "/login";
};

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Navbar() {
  const location = useLocation();
  const token = localStorage.getItem("token");


  if (location.pathname === "/login" || location.pathname === "/register") {
    return null;
  }

  const navLinks = [
    { path: "/", label: " FRA Atlas Map", public: true },
    { path: "/Veryfy", label: " Planning & Development", public: false },
    { path: "/forest-revenue", label: " Forest & Revenue", public: false },
    { path: "/allocated-pattas", label: " Allocated Pattas", public: true },
    { path: "/claimform", label: "NGO Claim Form", public: false },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md border-b-2 border-green-500">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold text-gray-800">Forest Rights Act</h1>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>


          <div className="flex items-center gap-2">
            {navLinks.map((link) => {

              // Show public links to everyone, private links only to authenticated users

              if (!link.public && !token) return null;

              const isActive = location.pathname === link.path;

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-green-600 text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Logout Button */}

          {token && (
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium border border-red-200"
            >
              <span className="flex items-center gap-2">
                Logout
              </span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        {/* Main content with padding-top to account for fixed navbar */}

        <main className="pt-20">
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/claimform"
              element={
                <PrivateRoute>
                  <ClaimForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/Veryfy"
              element={
                <PrivateRoute>
                  <PlanningandDevelopment />
                </PrivateRoute>
              }
            />
            <Route
              path="/forest-revenue"
              element={
                <PrivateRoute>
                  <PolygonAllocator />
                </PrivateRoute>
              }
            />
            <Route path="/allocated-pattas" element={<AllocatedPattas />} />
            <Route path="/" element={<FRAAtlasMap />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;