import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import notFound from "./middleware/notFound.js";
import globalErrorHandler from "./middleware/globalErrorHandler.js";
import { authRoute } from "./modules/auth/auth.route.js";

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoute);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "DevPulse API is running",
  });
});

app.use(notFound);
app.use(globalErrorHandler);

export default app;
