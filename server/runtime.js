export const CLIENT_JS = `
(() => {
  const root = document;
  const readData = () => {
    const node = root.getElementById("app-data");
    if (!node) return {};
    try { return JSON.parse(node.textContent || "{}"); } catch { return {}; }
  };
  const data = readData();
  const storeKey = document.body.dataset.storage || "atoms-lab";
  const readStore = () => {
    try { return JSON.parse(localStorage.getItem(storeKey) || "{}"); } catch { return {}; }
  };
  const writeStore = (value) => localStorage.setItem(storeKey, JSON.stringify(value));
  const say = (selector, text) => {
    const node = root.querySelector(selector);
    if (!node) return;
    node.hidden = false;
    node.textContent = text;
  };

  root.querySelectorAll("[data-acc]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.nextElementSibling;
      if (!panel) return;
      const open = panel.hasAttribute("hidden");
      panel.toggleAttribute("hidden", !open);
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  root.querySelectorAll("[data-bill]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.bill;
      root.querySelectorAll("[data-bill]").forEach((item) => item.classList.toggle("is-on", item === button));
      root.querySelectorAll("[data-price]").forEach((price) => {
        price.textContent = price.dataset[mode] || price.textContent;
      });
    });
  });

  const subscribe = root.querySelector("[data-subscribe]");
  if (subscribe) {
    subscribe.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = String(new FormData(subscribe).get("email") || "").trim();
      if (!email.includes("@") || !email.includes(".")) {
        say("[data-form-msg]", "请填写有效的邮箱。");
        return;
      }
      const saved = readStore();
      saved.emails = [...(saved.emails || []), { email, at: Date.now() }];
      writeStore(saved);
      subscribe.reset();
      say("[data-form-msg]", "已记在这台浏览器里。演示环境不会真的发信。");
    });
  }

  const navToggle = root.querySelector("[data-nav-toggle]");
  const navLinks = root.querySelector("[data-nav-links]");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => navLinks.classList.toggle("is-open"));
  }

  const cart = [];
  const cartBox = root.querySelector("[data-cart]");
  const cartLines = root.querySelector("[data-cart-lines]");
  const paintCart = () => {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    root.querySelectorAll("[data-cart-count]").forEach((node) => { node.textContent = String(count); });
    if (!cartLines) return;
    cartLines.replaceChildren();
    if (!cart.length) {
      const empty = document.createElement("p");
      empty.textContent = "购物袋还是空的。";
      cartLines.appendChild(empty);
      return;
    }
    let total = 0;
    cart.forEach((item) => {
      total += item.price * item.qty;
      const row = document.createElement("div");
      row.className = "cart-row";
      const name = document.createElement("span");
      name.textContent = item.name + " × " + item.qty;
      const price = document.createElement("strong");
      price.textContent = "¥" + item.price * item.qty;
      row.append(name, price);
      cartLines.appendChild(row);
    });
    const sum = document.createElement("p");
    sum.className = "cart-sum";
    sum.textContent = "合计 ¥" + total;
    cartLines.appendChild(sum);
  };
  root.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.name;
      const price = Number(button.dataset.price || 0);
      const found = cart.find((item) => item.name === name);
      if (found) found.qty += 1;
      else cart.push({ name, price, qty: 1 });
      paintCart();
      if (cartBox) cartBox.hidden = false;
      say("[data-cart-msg]", "已放入购物袋。");
    });
  });
  root.querySelectorAll("[data-open-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!cartBox) return;
      cartBox.hidden = !cartBox.hidden;
      paintCart();
    });
  });
  const checkout = root.querySelector("[data-checkout]");
  if (checkout) {
    checkout.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!cart.length) {
        say("[data-cart-msg]", "先选一件东西。");
        return;
      }
      const form = new FormData(checkout);
      const person = String(form.get("person") || "").trim();
      const contact = String(form.get("contact") || "").trim();
      if (person.length < 2 || !contact.includes("@")) {
        say("[data-cart-msg]", "请留下姓名，以及有效邮箱。");
        return;
      }
      const saved = readStore();
      const order = { person, contact, items: cart.map((item) => ({ ...item })), at: Date.now() };
      saved.orders = [...(saved.orders || []), order];
      writeStore(saved);
      cart.splice(0, cart.length);
      paintCart();
      checkout.reset();
      say("[data-cart-msg]", "演示订单已记下，编号 " + String(order.at).slice(-6) + "。不会真实扣款。");
    });
  }

  const booking = root.querySelector("[data-booking]");
  if (booking) {
    const chosen = { service: "", date: "", time: "" };
    const dates = root.querySelector("[data-dates]");
    if (dates) {
      const start = new Date();
      for (let i = 1; i <= 5; i += 1) {
        const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.date = (day.getMonth() + 1) + "/" + day.getDate();
        const week = "日一二三四五六"[day.getDay()];
        button.textContent = "周" + week + " " + button.dataset.date;
        dates.appendChild(button);
      }
    }
    const mark = (selector, value, key) => {
      root.querySelectorAll(selector).forEach((button) => {
        button.classList.toggle("is-on", button.dataset[key] === value);
      });
    };
    booking.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.service) {
        chosen.service = button.dataset.service;
        mark("[data-service]", chosen.service, "service");
      }
      if (button.dataset.date) {
        chosen.date = button.dataset.date;
        mark("[data-date]", chosen.date, "date");
      }
      if (button.dataset.time) {
        chosen.time = button.dataset.time;
        mark("[data-time]", chosen.time, "time");
      }
    });
    const form = root.querySelector("[data-book-form]");
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const person = String(new FormData(form).get("person") || "").trim();
      if (!chosen.service || !chosen.date || !chosen.time || person.length < 2) {
        say("[data-book-msg]", "请选择服务、日期、时间，并留下姓名。");
        return;
      }
      const saved = readStore();
      const code = String(Date.now()).slice(-6);
      saved.bookings = [...(saved.bookings || []), { ...chosen, person, code, at: Date.now() }];
      writeStore(saved);
      say("[data-book-msg]", "已预约 " + chosen.service + " · " + chosen.date + " " + chosen.time + "。回执编号 " + code + "。");
      form.reset();
    });
  }

  const todoRoot = root.querySelector("[data-todo]");
  if (todoRoot) {
    const saved = readStore();
    let todos = saved.todos || data.todos || [];
    let filter = "open";
    const list = root.querySelector("[data-todo-list]");
    const persist = () => {
      const next = readStore();
      next.todos = todos;
      writeStore(next);
    };
    const paint = () => {
      list.replaceChildren();
      const visible = todos.filter((item) => filter === "all" || (filter === "done" ? item.done : !item.done));
      if (!visible.length) {
        const empty = document.createElement("p");
        empty.className = "empty-copy";
        empty.textContent = filter === "done" ? "还没有完成的任务。" : "这一栏是空的。";
        list.appendChild(empty);
        return;
      }
      visible.forEach((item) => {
        const row = document.createElement("label");
        row.className = "todo-row" + (item.done ? " is-done" : "");
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = item.done;
        box.addEventListener("change", () => {
          item.done = box.checked;
          persist();
          paint();
        });
        const text = document.createElement("span");
        text.textContent = item.title;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "删除";
        remove.addEventListener("click", () => {
          todos = todos.filter((todo) => todo !== item);
          persist();
          paint();
        });
        row.append(box, text, remove);
        list.appendChild(row);
      });
    };
    root.querySelector("[data-todo-add]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = event.currentTarget.querySelector("input");
      const title = input.value.trim();
      if (!title) return;
      todos.unshift({ title, done: false });
      input.value = "";
      persist();
      paint();
    });
    root.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        filter = button.dataset.filter;
        root.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-on", item === button));
        paint();
      });
    });
    paint();
  }

  const dash = root.querySelector("[data-dash]");
  if (dash) {
    const rows = data.rows || [];
    let range = "week";
    let query = "";
    const kpis = root.querySelector("[data-kpis]");
    const body = root.querySelector("[data-rows]");
    const factors = { week: [1, 1], month: [3.4, 2.2] };
    const paint = () => {
      const [scale, visits] = factors[range];
      const cards = [
        ["进行中", String(Math.round(4 * scale))],
        ["待回复", String(Math.round(2 * visits))],
        ["本档金额", "¥" + Math.round(12800 * scale).toLocaleString("zh-CN")],
      ];
      kpis.replaceChildren();
      cards.forEach(([label, value]) => {
        const card = document.createElement("article");
        const name = document.createElement("span");
        name.textContent = label;
        const strong = document.createElement("strong");
        strong.textContent = value;
        card.append(name, strong);
        kpis.appendChild(card);
      });
      const filtered = rows.filter((row) => (row.name + row.owner + row.status).includes(query));
      body.replaceChildren();
      filtered.forEach((row) => {
        const tr = document.createElement("tr");
        [row.name, row.owner, row.status, row.amount].forEach((value) => {
          const td = document.createElement("td");
          td.textContent = value;
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
    };
    root.querySelector("[data-dash-q]")?.addEventListener("input", (event) => {
      query = event.target.value.trim();
      paint();
    });
    root.querySelectorAll("[data-range]").forEach((button) => {
      button.addEventListener("click", () => {
        range = button.dataset.range;
        root.querySelectorAll("[data-range]").forEach((item) => item.classList.toggle("is-on", item === button));
        paint();
      });
    });
    paint();
  }

  const finder = root.querySelector("[data-find]");
  if (finder) {
    const saved = readStore();
    const likes = new Set(saved.likes || []);
    const paint = () => {
      const query = finder.value.trim();
      root.querySelectorAll("[data-place]").forEach((card) => {
        const blob = card.dataset.place || "";
        card.hidden = query && !blob.includes(query);
        const button = card.querySelector("[data-like]");
        if (button) button.classList.toggle("is-on", likes.has(card.dataset.id));
      });
    };
    finder.addEventListener("input", paint);
    root.querySelectorAll("[data-like]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.closest("[data-place]")?.dataset.id;
        if (!id) return;
        if (likes.has(id)) likes.delete(id);
        else likes.add(id);
        const next = readStore();
        next.likes = [...likes];
        writeStore(next);
        paint();
      });
    });
    paint();
  }

  const reader = root.querySelector("[data-reader]");
  if (reader) {
    const posts = data.posts || [];
    const search = root.querySelector("[data-post-q]");
    const paintList = () => {
      const query = search ? search.value.trim() : "";
      root.querySelectorAll("[data-post]").forEach((card) => {
        card.hidden = query && !(card.dataset.post || "").includes(query);
      });
    };
    search?.addEventListener("input", paintList);
    root.querySelectorAll("[data-read]").forEach((button) => {
      button.addEventListener("click", () => {
        const post = posts.find((item) => item.title === button.dataset.read);
        if (!post) return;
        reader.hidden = false;
        reader.replaceChildren();
        const back = document.createElement("button");
        back.type = "button";
        back.textContent = "返回目录";
        back.addEventListener("click", () => { reader.hidden = true; });
        const title = document.createElement("h2");
        title.textContent = post.title;
        const body = document.createElement("p");
        body.textContent = post.body;
        reader.append(back, title, body);
        reader.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  const game = root.querySelector("[data-game]");
  if (game) {
    const arena = root.querySelector("[data-arena]");
    const scoreNode = root.querySelector("[data-score]");
    const bestNode = root.querySelector("[data-best]");
    const timeNode = root.querySelector("[data-time-left]");
    const start = root.querySelector("[data-start]");
    let score = 0;
    let left = 20;
    let timer = 0;
    let spawner = 0;
    const saved = readStore();
    let best = saved.best || 0;
    bestNode.textContent = String(best);
    const stop = () => {
      clearInterval(timer);
      clearInterval(spawner);
      timer = 0;
      spawner = 0;
    };
    const finish = () => {
      stop();
      arena.replaceChildren();
      if (score > best) {
        best = score;
        const next = readStore();
        next.best = best;
        writeStore(next);
      }
      bestNode.textContent = String(best);
      say("[data-game-msg]", score ? "这一局 " + score + " 分。最高 " + best + " 分。" : "这一局没有点中。最高 " + best + " 分。");
      start.disabled = false;
      start.textContent = "再来一局";
    };
    const spawn = () => {
      if (arena.children.length > 4) arena.firstElementChild?.remove();
      const target = document.createElement("button");
      target.type = "button";
      target.className = "target";
      target.style.left = Math.round(8 + Math.random() * 78) + "%";
      target.style.top = Math.round(12 + Math.random() * 68) + "%";
      target.textContent = "✦";
      target.addEventListener("click", (event) => {
        event.stopPropagation();
        score += 1;
        scoreNode.textContent = String(score);
        target.remove();
      });
      arena.appendChild(target);
    };
    start.addEventListener("click", () => {
      stop();
      score = 0;
      left = 20;
      scoreNode.textContent = "0";
      timeNode.textContent = "20";
      say("[data-game-msg]", "点中星屑。点到空白不加分。");
      arena.replaceChildren();
      start.disabled = true;
      spawn();
      spawner = setInterval(spawn, 700);
      timer = setInterval(() => {
        left -= 1;
        timeNode.textContent = String(left);
        if (left <= 0) finish();
      }, 1000);
    });
  }
})();
`;
