import { Router } from "express";
import SocioEconomic from "../models/socioEconomic.model.js";

const router=Router();

router.get("/", async (req, res) => {
  try {
    const data = await SocioEconomic.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// new socioeconomic record
router.post("/", async (req, res) => {
  try {
    const socio = await SocioEconomic.create(req.body);
    res.status(200).json(socio);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;