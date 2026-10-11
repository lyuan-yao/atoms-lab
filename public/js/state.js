export const state = { me: null };

export function setMe(user) {
  state.me = user;
  document.dispatchEvent(new CustomEvent("atoms-me"));
}

export const AGENTS = [
  { id: "Mike", role: "团队领导", color: "#ff8a3d", line: "把范围守住，并请你确认方向。" },
  { id: "Iris", role: "深度研究", color: "#8b6cff", line: "指出谁会打开这个页面。" },
  { id: "Emma", role: "产品经理", color: "#ff6fa5", line: "写成可以验收的范围。" },
  { id: "Bob", role: "架构师", color: "#7f93a8", line: "决定它如何被预览和发布。" },
  { id: "Alex", role: "工程师", color: "#3d7dff", line: "把范围编译成可点击的页面。" },
  { id: "Sarah", role: "SEO", color: "#3cbe7a", line: "写搜索结果里的那两句话。" },
  { id: "David", role: "数据分析", color: "#2bb8a6", line: "只建议先看一个数。" },
  { id: "Adrian", role: "广告增长", color: "#e2a325", line: "起草一条还没投放的广告。" },
];

export function agentById(id) {
  return AGENTS.find((agent) => agent.id === id) || AGENTS[0];
}
