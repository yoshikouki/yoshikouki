import iconv from "iconv-lite";
import puppeteer from "puppeteer";
import sanitizeHtml from "sanitize-html";

const fetchTitleByPuppeteer = async (url: string): Promise<string> => {
  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    );
    await page.goto(url, { waitUntil: "networkidle0", timeout: 10_000 });
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
  const title = html.match(/<title>(.*?)<\/title>/)?.[1] || "";
  return title;
};

const fetchTitle = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();

  // まずUTF-8でデコードしてメタタグを確認
  const utf8Html = new TextDecoder("utf-8").decode(buffer);
  const metaCharset = utf8Html
    .match(/<meta[^>]*charset=["']?([^"'>;]*)/i)?.[1]
    ?.toLowerCase();

  const html = metaCharset?.includes("shift")
    ? iconv.decode(Buffer.from(buffer), "shift-jis")
    : utf8Html;

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

export const getContent = async (url: string): Promise<string> => {
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
