import { $ } from "bun";

const INPUTS_STORE_FILE_NAME = "inputs.json";
export const INPUTS_STORE_FILE_PATH = `${process.cwd()}/${INPUTS_STORE_FILE_NAME}`;
export const INPUTS_MARKDOWN_FILE_PATH = `${process.cwd()}/inputs.md`;

export type Input = {
  url: string;
  date: string;
  id: string;
};
export type Inputs = Input[];

const read = async (): Promise<Inputs> => {
  return await Bun.file(INPUTS_STORE_FILE_PATH).json();
};

export const commit = async ({
  files,
  message,
}: {
  files: string[];
  message: string;
}) => {
  await $`git config --global user.name 'Input Bot'`;
  await $`git config --global user.email 'actions@github.com'`;
  await $`git add ${files.join(" ")}`;
  await $`git commit -m '${message}'`;
  try {
    await $`git push`;
  } catch (error) {
    console.error(error);
    await $`git pull --rebase`;
    await $`git push`;
  }
};

export const writeInputsJson = async (inputs: Inputs) => {
  await Bun.write(INPUTS_STORE_FILE_PATH, JSON.stringify(inputs, null, 2));
};

export const addMdTableRows = async (md: string) => {
  const lines = (await Bun.file(INPUTS_MARKDOWN_FILE_PATH).text()).split("\n");
  const newLines = [...lines.slice(0, 2), md, ...lines.slice(2)];
  await Bun.write(INPUTS_MARKDOWN_FILE_PATH, newLines.join("\n"));
};

const save = async (input: Input): Promise<Inputs> => {
  const newJson = [input, ...(await read())];
  await writeInputsJson(newJson);
  await commit({
    files: [INPUTS_STORE_FILE_PATH],
    message: input
      ? `Added input ${input.url.replace(/^https?:\/\//, "")}`
      : "Added input",
  });
  return newJson;
};

export const storeUrl = async (url: string) => {
  const jstDate = new Date().toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
  });
  return await save({ url, date: jstDate, id: crypto.randomUUID() });
};
