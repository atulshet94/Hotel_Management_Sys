const app = require("./src/app");
const env = require("./src/config/env");

app.listen(env.port, () => {
  console.log(`Sanman Lodge backend listening on port ${env.port}`);
});
