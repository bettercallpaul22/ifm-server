import { app } from "./app.js";
import { env } from "./config/env.js";
const PORT = env.PORT;

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
});
