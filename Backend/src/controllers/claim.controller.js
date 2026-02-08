import { timingSafeEqual } from "crypto";
import Claim from "../models/claimform.model.js";
import Document from "../models/DocumentSchema.model.js";

const createClaim=async(req,res)=>{

    try {
    const claim = await Claim.create({
      ...req.body,
      createdBy: req.user._id, 
    });

    res.status(200).json(claim);
  } catch (err) {
    res.status(400).json({ message: "Claim creation failed", error: err.message });
  }
}

const uploadClaimDocument= async(req,res)=>{

    try{
        const { claimId } = req.params;

        const doc=await Document.create({
            claim:claimId,
            incomeCertificate: req.files?.incomeCertificate?.[0],
            casteCertificate: req.files?.casteCertificate?.[0],
            idProof: req.files?.idProof?.[0],
            landDocument: req.files?.landDocument?.[0],
            otherDocs: req.files?.otherDocs || [],
        })

        res.status(200).json(doc);

    }catch (err) {
    res.status(400).json({ message: "Document upload failed", error: err.message });
  }
};

const ClaimStatus= async(req,res)=>{
      try{
        const{status}=req.body;
        const claim=await Claim.findByIdAndUpdate(
            req.params.id,
            {status},
            {new :true}
        )
        res.json(claim);
      }catch(err){
        res.status(400).json({message:"Status update failed"});
      }
}


const getAllClaims =async(req,res)=>{
      try{
          const claim=await Claim.find();
          res.status(200).json(claim);
      }catch(err){
        res.status(400).json({message:"Failed to fetch claim"});
      }
}

const getClaimById= async(req,res)=>{
      try{
          const claim=await Claim.findById(req.params.id);
          if(!claim){
            return res.status(200).json({message:"Claim not found"});
          }
          res.json(claim);
      }catch(err){
            res.status(400).json({message:"Invlid Id"});
      }
}


const updateClaimPolygon = async(req,res)=>{

      try{
          const coords=req.body;
          const claim=await Claim.findByIdAndUpdate(
                req.params.id,
                {
        location: {
          type: "Polygon",
          coordinates: [coords],
         },
           status: "VERIFIED",
         },
         { new: true }
        );

       res.json(claim);

      }catch(err){
        res.status(400).json({message:"Polygon Update Failed"});
      }
}

export {createClaim,uploadClaimDocument,ClaimStatus,getAllClaims,getClaimById,updateClaimPolygon};