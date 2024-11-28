import { load } from "cheerio";
import puppeteer from "puppeteer";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";

const UrlSchema = z.string().url();

const getUrl = (): string => {
  const url: string | undefined = process.env.URL || process.argv[2];
  try {
    UrlSchema.parse(url);
    return url;
  } catch (error) {
    throw new Error(
      `URL Error: ${error instanceof Error ? error.message : error}`,
    );
  }
};

const fetchTitleByPuppeteer = async (url: string): Promise<string> => {
  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    );
    await page.goto(url, { waitUntil: "networkidle0", timeout: 3000 });
    const title = await page.title();
    return title;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve the content. ${error.message}`);
    }
    throw new Error(`Failed to retrieve the content. ${error}`);
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
      `Failed to retrieve the content. HTTP status: ${response.status}`,
    );
  }
  const html = await response.text();
  const title = extractTitle(html);
  return title;
};

const truncate = (text: string, length: number): string => {
  if (text.length <= length) {
    return text;
  }
  const truncatedText = text.substring(0, length - 1);
  return `${truncatedText}…`;
};

const formatContent = (content: string): string => {
  const formattedContent = content
    // Remove newlines
    .replace(/\n/g, " ")
    // Remove extra spaces
    .replace(/\s{2,}/g, " ")
    // Escape backticks
    .replace(/`/g, "\\`")
    .trim();
  const truncatedContent = truncate(formattedContent, 100);
  return truncatedContent;
};

const sanitize = (input: string): string => {
  return sanitizeHtml(input, {
    allowedTags: [], // No HTML tags are allowed
    allowedAttributes: {}, // No HTML attributes are allowed
  });
};

const isTwitterUrl = (url: string): boolean => {
  return /(twitter|x)\.com/.test(url);
};

const getContent = async (url: string): Promise<string> => {
  let rawContent: string;
  if (isTwitterUrl(url)) {
    // For Twitter, return the tweet text
    rawContent = await fetchTitleByPuppeteer(url);
  } else {
    // For other sites, return the page title
    rawContent = await fetchTitle(url);
  }
  if (!rawContent) {
    throw new Error("Failed to retrieve the content. No title found");
  }

  const sanitizedContent = sanitize(rawContent);
  const formattedContent = formatContent(sanitizedContent);
  return formattedContent;
};

const getTodayString = (): string => {
  const currentDate = new Date();
  const formattedDate = `${currentDate.getFullYear()}/${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
  return formattedDate;
};

const run = async () => {
  const url = getUrl();
  const content = await getContent(url);
  const today = getTodayString();
  const output = `- [${content}](${url}): ${today}`;
  console.log(output);
};

run();
