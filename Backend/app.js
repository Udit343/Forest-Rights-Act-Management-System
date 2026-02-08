import dotenv from "dotenv";
dotenv.config();

import express from "express";

import mongoose  from "mongoose";

import cors from "cors";

import userRoutes from "./src/routes/users.route.js";
import claimsRoute from "./src/routes/claims.route.js";
import pattaRoute from "./src/routes/patta.route.js";
import socioRoute from "./src/routes/socioeconomic.route.js";

const app=express();




app.use(cors({
    origin: "http://localhost:5173", // -< React URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json({limit:"40kb"}));
app.use(express.urlencoded({limit:"40kb", extended: true}));

app.use("/api/v1/users",userRoutes);
app.use("/api/v1/claims",claimsRoute);
app.use("/api/v1/pattas",pattaRoute);
app.use("/api/v1/socio",socioRoute);

app.set("port", (process.env.PORT || 8000));

app.get("/", (req,res)=>{
    return res.json({"Hello":"world"});
})

const start=async()=>{
try{

const connectDB= await mongoose.connect("mongodb+srv://uditpandit343_db_user:tidu54321@cluster0.4jwvffn.mongodb.net/tribalsDB?appName=Cluster0");

console.log(`Database connected DB Host ${connectDB.connection.host}`)

app.listen(app.get("port"), ()=>{

    console.log("Server is rugging 8000");
})
}catch(e){
    console.log(`database connection fail ${e}`);
}
}
start();
export default app;