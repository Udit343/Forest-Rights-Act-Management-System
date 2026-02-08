
import mongoose from "mongoose";

const socioeconomicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  claimId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Claim",
    required: true 
  },
  pattaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Patta" 
  },
  

  hasPuccaHouse: { type: Boolean, default: false },
  

  annualIncome: { type: Number, required: true },
  

  isEmployedInGovt: { type: Boolean, default: false },
  

  hasRationCard: { type: Boolean, default: false },
  

  isStudent: { type: Boolean, default: false },
  lastExamPercentage: { type: Number },
  hasOtherScholarship: { type: Boolean, default: false },
  

  familySize: { type: Number },
  age: { type: Number },
  
}, { timestamps: true });

const SocioEconomic = mongoose.model("SocioEconomic", socioeconomicSchema);

export default SocioEconomic;