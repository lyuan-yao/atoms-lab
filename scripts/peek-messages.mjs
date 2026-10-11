import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("D:/atoms/data/atoms.sqlite");
const project = db.prepare("SELECT id, name FROM projects ORDER BY created_at DESC LIMIT 1").get();
console.log("project", project);
const rows = db.prepare("SELECT role, ifnull(agent,'') agent, substr(body,1,20) body, created_at FROM messages WHERE project_id = ? ORDER BY created_at ASC").all(project.id);
for (const row of rows) console.log(row.role, row.agent, row.created_at, row.body);
