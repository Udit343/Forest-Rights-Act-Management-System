import { json } from "express";
import Patta from "../models/patta.model.js";
import SocioEconomic from "../models/socioEconomic.model.js";

export const createPatta = async (req, res) => {
  const patta = new Patta(req.body);
  await patta.save();
  if (patta.claimId) {
      await SocioEconomic.findOneAndUpdate(
        { claimId: patta.claimId },
        { pattaId: patta._id }
      );
    }
  res.json(patta);
};

export const getPattas = async (req, res) => {
  const pattas = await Patta.find();
  res.json(pattas);
};

export const getPattaById = async (req, res) => {
  const patta = await Patta.findById(req.params.id);
  res.json(patta);
};


export const getPattasGeoJSON = async (req, res) => {
       
  try {

    const pattas = await Patta.find().populate("claimId");

    const features = pattas
      .filter((p) => p.claimId && (p.claimId.location?.type === "Polygon" || 
     p.claimId.location?.type === "MultiPolygon"))
      .map((p) => ({
        type: "Feature",
        geometry: p.claimId.location,
        properties: {
          pattaNumber: p.pattaNumber,
          holderName: p.holderName || p.claimId.claimantName,
          grantedArea: p.grantedArea,
          issueDate: p.issueDate,
          villageName: p.claimId.villageName,
          district: p.claimId.district,
        },
      }));


      res.json({
        
          type:"FeatureCollection",
          features
      })
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
