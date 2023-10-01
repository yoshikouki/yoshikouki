import { load } from "cheerio";

const getUrl = (): string => {
  const url: string | undefined = process.argv[2];
  if (!url) {
    throw new Error("A URL is required");
  }
  if (!/^(https?:\/\/)?([^\s]+)/.test(url)) {
    throw new Error("Invalid URL");
  }
  return url;
};

const getContent = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (response.status !== 200) {
      throw new Error(
        `Failed to retrieve the content. HTTP status: ${response.status}`
      );
    }

    const html = await response.text();
    const $ = load(html);

    if (url.includes("twitter.com")) {
      // twitter の場合は、meta[property='og:description'] を返す
      const description = $(
        "meta[property='og:description']"
      ).attr(
        "content"
      );
      if (!description) {
        throw new Error(
          "Failed to retrieve the X content. No og:description found"
        );
      }
      return description;
    } else {
      // head.title を返す
      const title = $("head title").text();
      if (!title) {
        throw new Error("Failed to retrieve the content. No title found");
      }
      return title;
    }
  } catch (error) {
    throw new Error(
      `An error occurred while fetching the content: ${error.message}`
    );
  }
};

const run = async () => {
  const url = getUrl();
  const content = await getContent(url);
  const output = `[${content}](${url})`;
  console.log(output);
};

run();
