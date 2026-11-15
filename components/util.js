/**
 * to link components' css into html
 */
export const linkCSS = (cssRelFilePath, baseUrl = import.meta.url) => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL(cssRelFilePath, baseUrl);
  document.head.append(link);
};
