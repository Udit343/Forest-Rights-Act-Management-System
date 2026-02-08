dotenv.config();
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

const JWT_SECRET=process.env.JWT_SECRET;

const Auth= async(req,res,next)=>{

      try{
        const authheader=req.headers.authorization;

        if(!authheader){
            return res.status(400).json({message:"Authorization missing"});
        }

        const token = authheader.split(" ")[1];

        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded.userId);

        if(!user){
            return res.status(400).json({message:"Invalid Token"});
        }

        req.user=user;

        next();

      }catch(e){
        return res.status(400).json({ message: "Token expired or invalid. Please login again." });
      }
}

export default Auth;