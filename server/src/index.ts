import "dotenv/config";
import { createApp } from "./app.js";

const app = createApp();
const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
