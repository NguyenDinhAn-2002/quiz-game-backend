import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Route mẫu
app.get("/", (_, res) => {
  res.send("Quiz API is running 🚀");
});

export default app;
