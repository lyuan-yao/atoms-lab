import { api } from "./api.js";
import { renderAbout, renderAgents, renderExplore, renderHelp, renderHome, renderLogin, renderNotFound, renderPricing, renderSettings } from "./pages.js";
import { navigate, onRoute } from "./router.js";
import { setMe, state } from "./state.js";
import { renderStudio } from "./studio.js";

const routes = [
  { test: (path) => path === "/", auth: false, render: renderHome, theme: "dark" },
  { test: (path) => path === "/pricing", auth: false, render: renderPricing, theme: "dark" },
  { test: (path) => path === "/agents", auth: false, render: renderAgents, theme: "dark" },
  { test: (path) => path === "/explore", auth: false, render: renderExplore, theme: "dark" },
  { test: (path) => path === "/about", auth: false, render: renderAbout, theme: "dark" },
  { test: (path) => path === "/help", auth: false, render: renderHelp, theme: "dark" },
  { test: (path) => path === "/settings", auth: true, render: renderSettings, theme: "light" },
  { test: (path) => path === "/login" || path === "/register", auth: false, render: renderLogin, theme: "dark" },
  { test: (path) => path === "/studio" || path.startsWith("/studio/"), auth: true, render: renderStudio, theme: "light" },
];

function draw() {
  const root = document.getElementById("app");
  const path = location.pathname;
  const route = routes.find((item) => item.test(path));
  document.body.dataset.theme = route?.theme || "dark";
  if (route?.auth && !state.me) {
    sessionStorage.setItem("atoms.return", path);
    navigate("/login", { replace: true });
    return;
  }
  if ((path === "/login" || path === "/register") && state.me && !sessionStorage.getItem("atoms.autostart")) {
    navigate("/studio", { replace: true });
    return;
  }
  (route?.render || renderNotFound)(root);
}

onRoute(draw);

document.addEventListener("atoms-me", () => {
  if (!state.me) return;
  document.querySelectorAll("[data-credits]").forEach((node) => {
    const plan = node.hasAttribute("data-with-plan") ? ` · ${state.me.plan}` : "";
    node.textContent = `${state.me.credits} 积分${plan}`;
  });
});

try {
  const me = await api("/api/me");
  setMe(me.user);
  draw();
} catch (error) {
  document.getElementById("app").innerHTML = `<main class="page hero"><h1>工作室没有启动</h1><p>${error.message}</p></main>`;
}
