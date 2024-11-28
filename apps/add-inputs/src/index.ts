import { storeUrl } from "./store";
import { getUrl } from "./url";

const main = async () => {
  const url = getUrl();
  await storeUrl(url);
};

await main();
