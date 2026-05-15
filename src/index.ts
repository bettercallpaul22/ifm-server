import { app } from "./app";
import { env } from "./config/env";
const PORT = env.PORT;

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
});
