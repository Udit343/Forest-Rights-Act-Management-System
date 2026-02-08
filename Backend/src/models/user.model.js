import mongoose  from "mongoose";

const userSchema=new mongoose.Schema({

      name:{type:String, required:true},
      email:{ type: String, unique:true, required:true, lowercase:true},
      password: {type: String,  required: true},
      role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER"
    }
      
}, {timestamps: true});

const User=mongoose.model("User", userSchema);

export {User};


