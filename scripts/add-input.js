import { GlobalWindow as Window } from "happy-dom";

const getUrl = () => {
  const url = process.argv[2];
  if (!url) {
    throw new Error("A URL is required");
  }
  if (!/^(https?:\/\/)?([^\s]+)/.test(url)) {
    throw new Error("Invalid URL");
  }
  return url;
};

const getContent = async (url) => {
  try {
    const response = await fetch(url);
    if (response.status !== 200) {
      throw new Error(
        `Failed to retrieve the content. HTTP status: ${response.status}`
      );
    }

    const html = await response.text();
    const window = new Window();
    window.document.write(html);

    if (url.includes("twitter.com")) {
      // twitter の場合は、meta[property='og:description'] を返す
      const description = window.document.head.querySelector(
        "meta[property='og:description']"
      );
      if (!description) {
        throw new Error(
          "Failed to retrieve the X content. No og:description found"
        );
      }
      return description.getAttribute("content") || "";
    } else {
      // head.title を返す
      const title = window.document.head.querySelector("title");
      if (!title) {
        throw new Error("Failed to retrieve the content. No title found");
      }
      return title.textContent || "";
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
