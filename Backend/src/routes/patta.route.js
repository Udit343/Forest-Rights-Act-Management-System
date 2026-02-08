import { Router } from "express";
import { createPatta,getPattas,getPattaById,getPattasGeoJSON } from "../controllers/patta.controller.js";

const router=Router();

router.post("/",createPatta);
router.get("/",getPattas);
router.get("/geojson",getPattasGeoJSON);
router.get("/:id",getPattaById);


export default router;