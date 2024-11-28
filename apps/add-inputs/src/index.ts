import { getContent } from "./remote-contents";
import { getUrl } from "./url";

const getTodayString = (): string => {
  const currentDate = new Date();
  const formattedDate = `${currentDate.getFullYear()}/${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
  return formattedDate;
};

const url = getUrl();
const content = await getContent(url);
const today = getTodayString();
const output = `- [${content}](${url}): ${today}`;
console.log(output);
