import { getContent } from "./remote-contents";
import {
  INPUTS_MARKDOWN_FILE_PATH,
  INPUTS_STORE_FILE_PATH,
  type Input,
  type Inputs,
  addMdTableRows,
  commit,
  writeInputsJson,
} from "./store";

const inputToMd = async (input: Input) => {
  const content = await getContent(input.url);
  if (!content) {
    throw new Error("Failed to retrieve the content. No title found");
  }
  const date = new Date(input.date).toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
  });
  return `| ${date} | [${content}](${input.url}) |`;
};

export const convertJsonToMd = async (
  _inputs: Inputs,
): Promise<{ md: string; json: Inputs }> => {
  const mdRows = [];
  const newInputs = [];
  const inputs = _inputs.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    try {
      const mdRow = await inputToMd(input);
      if (mdRow) {
        mdRows.push(mdRow);
      } else {
        newInputs.push(input);
      }
    } catch (error) {
      console.error(error);
      newInputs.push(input);
    }
    process.stdout.write(`\rProcessing inputs: ${i + 1} / ${inputs.length}`);
  }
  return { md: mdRows.join("\n"), json: newInputs };
};

if (import.meta.main) {
  const json = await Bun.file("inputs.json").json();
  const { md, json: newJson } = await convertJsonToMd(json);
  if (!md) process.exit(0);
  await addMdTableRows(md);
  await writeInputsJson(newJson);
  await commit({
    files: [INPUTS_STORE_FILE_PATH, INPUTS_MARKDOWN_FILE_PATH],
    message: "Convert inputs.json to inputs.md",
  });
}
