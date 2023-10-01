import { load } from "cheerio";
import puppeteer from "puppeteer";

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

const fetchTitleByPuppeteer = async (url: string): Promise<string> => {
  const browser = await puppeteer.launch({
    headless: "new",
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    await page.goto(url, { waitUntil: "networkidle0", timeout: 3000 });
    const title = await page.title();
    return title;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve the content. ${error.message}`);
    } else {
      throw new Error(`Failed to retrieve the content. ${error}`);
    }
  } finally {
    await browser.close();
  }
};

const extractTitle = (html: string): string => {
  const $ = load(html);
  const title = $("head title").text();
  return title;
};

const fetchTitle = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (response.status !== 200) {
    throw new Error(
      `Failed to retrieve the content. HTTP status: ${response.status}`
    );
  }
  const html = await response.text();
  const title = extractTitle(html);
  return title;
};

const formatContent = (content: string): string => {
  const formattedContent = content
    // Remove newlines
    .replace(/\n/g, " ")
    // Remove extra spaces
    .replace(/\s{2,}/g, " ")
    .trim();
  return formattedContent;
}

const getContent = async (url: string): Promise<string> => {
  let rawContent: string;
  if (url.includes("twitter.com")) {
    // For Twitter, return the tweet text
    rawContent = await fetchTitleByPuppeteer(url);
  } else {
    // For other sites, return the page title
    rawContent = await fetchTitle(url);
  }
  if (!rawContent) {
    throw new Error("Failed to retrieve the content. No title found");
  }

  const content = formatContent(rawContent);
  return content;
};

const run = async () => {
  const url = getUrl();
  const content = await getContent(url);
  const output = `[${content}](${url})`;
  console.log(output);
};

run();
