import mongoose from "mongoose";

const claimSchema=new mongoose.Schema({
      claimantName: String,
      villageName: String,
      district: String,
      state: String,
      claimType: {
    type: String,
    enum: ["IFR", "CR", "CFR"],
    required: true,
  },
  claimedArea: Number,
  location: {
    type: {
      type: String,
      enum: ["Polygon"],
    },
    coordinates: [[[Number]]],
  },

  status: {
    type: String,
    enum: ["PENDING", "VERIFIED", "REJECTED"],
    default: "PENDING",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
})

const Claim=mongoose.model("Claim",claimSchema);

export default Claim;