import mongoose from "mongoose";

const KnowledgeBaseSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["policy", "faq"],
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
      // Dimensions for Gemini (text-embedding-004/001) are 768
    },
  },
  { timestamps: true }
);

// Atlas Vector Search Configuration (JSON for reference/index creation)
/*
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "type"
    }
  ]
}
*/

export default mongoose.model("KnowledgeBase", KnowledgeBaseSchema);
