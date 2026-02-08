import { Router } from "express";
import {createClaim,uploadClaimDocument,ClaimStatus,getAllClaims,getClaimById,updateClaimPolygon} from "../controllers/claim.controller.js";
import Auth from "../middleware/auth.middleware.js";
import upload from "../middleware/upload..iddleware.js";
import verifyAdmin from "../middleware/verifyAdmin.js";

const router=Router();

router.post("/claim",Auth, createClaim);
router.post(
  "/:claimId/documents",
  upload.fields([
    { name: "incomeCertificate", maxCount: 1 },
    { name: "casteCertificate", maxCount: 1 },
    { name: "idProof", maxCount: 1 },
    { name: "landDocument", maxCount: 1 },
    { name: "otherDocs", maxCount: 10 },
  ]),
  uploadClaimDocument
);

router.put("/:id/status", ClaimStatus);

router.get("/",getAllClaims);
router.get("/:id",getClaimById);
router.put("/:id/polygon",verifyAdmin, updateClaimPolygon);

export default router;