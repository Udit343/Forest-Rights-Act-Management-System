import mongoose from "mongoose";

const pattaSchema=new mongoose.Schema({
      pattaNumber:String,
      issueDate:String,
      grantedArea:Number,
      claimId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Claim"
      }
});

const Patta = mongoose.model("Patta",pattaSchema);

export default Patta;

