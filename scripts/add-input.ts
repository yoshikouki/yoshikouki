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

const fetchHTML = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (response.status !== 200) {
    throw new Error(
      `Failed to retrieve the content. HTTP status: ${response.status}`
    );
  }
  const html = await response.text();
  return html;
};

const extractContent = (html: string, url: string): string => {
  const $ = load(html);
  if (url.includes("twitter.com")) {
    // For Twitter, return the tweet text
    const description = $("meta[property='og:description']").attr("content");
    if (!description) {
      throw new Error(
        "Failed to retrieve the X content. No og:description found"
      );
    }
    return description;
  } else {
    // For other sites, return the page title
    const title = $("head title").text();
    if (!title) {
      throw new Error("Failed to retrieve the content. No title found");
    }
    return title;
  }
};

const getContent = async (url: string): Promise<string> => {
  const html = await fetchHTML(url);
  const content = extractContent(html, url);
  return content;
};

const run = async () => {
  const url = getUrl();
  const content = await getContent(url);
  const output = `[${content}](${url})`;
  console.log(output);
};

run();
