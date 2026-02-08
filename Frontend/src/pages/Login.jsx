import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import BaseURL from "./Api";


export default function Login() {

  const [form, setForm] = useState({ 
    email: " ",
    password: " " 
});


  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${BaseURL}/api/v1/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      

      if (!res.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("token", data.token);

      setMessage(" Login successful!");

      setTimeout(()=>{
        navigate("/claimform");
      },1500)
      
    } catch (err) {
      setMessage(` ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96">
        <h2 className="text-2xl font-bold text-center mb-4">Login</h2>

        {message && (
          <p className="text-center mb-3 text-sm text-green-600">{message}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
            type="submit"
          >
            Login
          </button>
        </form>

        <p className="text-center mt-4 text-sm">
          Don’t have an account?{" "}
          <Link to="/register" className="text-green-600 font-semibold">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
