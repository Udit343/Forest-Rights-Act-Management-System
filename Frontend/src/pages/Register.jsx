import { useState } from "react";
import BaseURL from "./Api";
import { Link, useNavigate } from "react-router-dom";


export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "" 
  });

  const [message, setMessage] = useState("");


  const handleChange = (e) => {

    setForm({ ...form, [e.target.name]: e.target.value });

  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BaseURL}/api/v1/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");

      setMessage(" Registered successfully! Please login.");

      setTimeout(()=>{
        navigate("/login");
      }, 1500);
      
    } catch (err) {
      setMessage(` ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96">
        <h2 className="text-2xl font-bold text-center mb-4">Register</h2>

        {message && (
          <p className="text-center mb-3 text-sm text-blue-600">{message}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full p-2 border rounded-lg"
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <input
            className="w-full p-2 border rounded-lg"
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            className="w-full p-2 border rounded-lg"
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            type="submit"
          >
            Register
          </button>
        </form>

        <p className="text-center mt-4 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 font-semibold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
