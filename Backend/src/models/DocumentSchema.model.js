import mongoose from "mongoose";

const claimdocumentSchema=new mongoose.Schema({

      claim: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Claim",
      required: true,
      },
    
    incomeCertificate: {
      filename: String,
      path: String,
      mimetype: String,
      size: Number,
    },

    casteCertificate: {
      filename: String,
      path: String,
      mimetype: String,
      size: Number,
    },

    idProof: {
      filename: String,
      path: String,
      mimetype: String,
      size: Number,
    },

    landDocument: {
      filename: String,
      path: String,
      mimetype: String,
      size: Number,
    },

    otherDocs: [
      {
        filename: String,
        path: String,
        mimetype: String,
        size: Number,
      },
    ],
})

const Document=mongoose.model("Document",claimdocumentSchema);

export default Document;