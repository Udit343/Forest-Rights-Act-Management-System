dotenv.config();
import {User} from '../models/user.model.js';
import bcrypt,{hash} from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";



const JWT_SECRET = process.env.JWT_SECRET;


const login = async (req, res) => {

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please provide email and password" });
  }



  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token= jwt.sign(
          {userId: user._id, email: user.email, role: user.role || "USER"},
          JWT_SECRET,
          { expiresIn: "5m" }
    );

  res.status(200).json({ token , role: user.role || "USER"});
  } catch (error) {
    res.status(500).json({ message: "Login failed", error });
  }
};



const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });

  } catch (error) {
    res.status(500).json({ message: "Registration failed", error });
  }
};

export {login,register};