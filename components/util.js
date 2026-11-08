/**
 * to link components' css into html
 */
export const linkCSS = (cssRelFilePath) => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL(cssRelFilePath, import.meta.url);
  document.head.append(link);
};
