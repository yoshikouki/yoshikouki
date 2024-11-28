import { $ } from "bun";

const INPUTS_STORE_FILE_NAME = "Inputs.json";
const INPUTS_STORE_FILE_PATH = `${process.cwd()}/${INPUTS_STORE_FILE_NAME}`;

type Input = {
  url: string;
  date: string;
};
type Inputs = Input[];

const read = async (): Promise<Inputs> => {
  return await Bun.file(INPUTS_STORE_FILE_PATH).json();
};

const commit = async () => {
  await $`git config --global user.name 'Input Bot'`;
  await $`git config --global user.email 'actions@github.com'`;
  await $`git add ${INPUTS_STORE_FILE_PATH}`;
  await $`git commit -m 'Add input by Input Bot'`;
  await $`git push`;
};

const save = async (input: Input): Promise<Inputs> => {
  const newJson = [input, ...(await read())];
  await Bun.write(INPUTS_STORE_FILE_PATH, JSON.stringify(newJson, null, 2));
  await commit();
  return newJson;
};

export const storeUrl = async (url: string) => {
  const jstDate = new Date().toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
  });
  return await save({ url, date: jstDate });
};