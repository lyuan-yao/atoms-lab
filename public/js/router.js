let render = () => {};

export function onRoute(fn) {
  render = fn;
}

export function navigate(path, { replace = false } = {}) {
  if (location.pathname !== path) {
    history[replace ? "replaceState" : "pushState"]({}, "", path);
  }
  render();
  window.scrollTo(0, 0);
}

export function setPath(path) {
  if (location.pathname !== path) history.pushState({}, "", path);
}

window.addEventListener("popstate", () => render());

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-link]");
  if (!link) return;
  const href = link.getAttribute("href");
  if (!href || href.startsWith("http")) return;
  event.preventDefault();
  navigate(href);
});
