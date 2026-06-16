/**
 * Memory Orbs 激活服务器 — Cloudflare Worker
 *
 * KV 存储格式：
 *   user@example.com                     → "authorized" | "activated_1746123456"
 *                                        | "admin" | "admin_1746123456"
 *                                        | "gift" | "gift_1746123456"
 *   account:user@example.com             → {password_hash, created_at}
 *   session:xxx...                       → email (TTL: 24h, expiresAt metadata)
 *   order:alipay-order-id                → {email, amount, expectedAmount, status, paidAt, fulfilledAt}
 *   purchase:user@example.com:{ts}       → {email, timestamp}（旧记录保留）
 *
 * API:
 *   POST /activate   { email, code }      → { valid: true/false, reason: "..." }
 *   POST /verify     { email, code }      → { valid: true/false }
 *   POST /purchase   { email }            → 已关闭；付款后由管理员人工在 KV 授权
 *   POST /register   { email, password }  → { success: true }
 *   POST /login      { email, password }  → { success: true, token: "..." }
 *   POST /my-keys    { token }            → { keys: [...] }
 */

// ─── 工具函数 ────────────────────────────────────────

function normalizeEmail(email) {
	return String(email || "").trim().toLowerCase();
}

function normalizeCode(code) {
	return String(code || "").trim().toUpperCase();
}

function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
}

/**
 * 生成激活码：HMAC-SHA256(邮箱, 密钥) → 取前20位 hex → 大写 → 每5位加-
 */
async function generateCode(email, secret) {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"]
	);
	const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(email));
	const hex = Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
		.substring(0, 20)
		.toUpperCase();
	return hex.replace(/(.{5})/g, "$1-").slice(0, -1);
}

/**
 * 密码哈希：PBKDF2(HMAC-SHA256, password, salt=email+secret, 100000 iter)
 */
async function hashPassword(password, email, secret) {
	const encoder = new TextEncoder();
	const salt = encoder.encode("mo:" + email + ":" + secret);
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(password),
		{ name: "PBKDF2" },
		false,
		["deriveBits"]
	);
	const hash = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
		key,
		256
	);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * 生成 session token：HMAC(email + timestamp, SECRET)
 */
async function generateToken(email, secret) {
	const data = email + "|" + Date.now();
	return await generateCode(data, secret);
}

/**
 * 验证 session token
 */
async function verifyToken(token, env) {
	const email = await env.MEMORY_ORBS_USERS.get("session:" + token);
	return email || null;
}

// ─── Worker ──────────────────────────────────────────

export async function onRequest({ request, env }) {
		const url = new URL(request.url);
		const apiPaths = new Set(["/activate", "/verify", "/register", "/login", "/my-keys", "/purchase", "/stats"]);
		if (!apiPaths.has(url.pathname)) {
			return env.ASSETS.fetch(request);
		}

		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		}

		if (request.method !== "POST") {
			return json({ error: "method_not_allowed" }, 405);
		}

		// ──────────────────────────────────────────
		// POST /activate — 首次激活
		// ──────────────────────────────────────────
		if (url.pathname === "/activate") {
			try {
				const { email, code } = await request.json();
				if (!email || !code || typeof email !== "string" || typeof code !== "string") {
					return json({ valid: false, reason: "missing_fields" });
				}
				if (!email.includes("@")) {
					return json({ valid: false, reason: "invalid_email" });
				}

				const normalized = normalizeEmail(email);
				const record = await env.MEMORY_ORBS_USERS.get(normalized);
				if (!record) {
					return json({ valid: false, reason: "email_not_authorized" });
				}
				const expectedCode = await generateCode(normalized, env.SECRET);
				if (normalizeCode(code) !== expectedCode) {
					return json({ valid: false, reason: "invalid_code" });
				}

				if (record.includes("_")) {
					return json({ valid: true, already_activated: true });
				}

				const prefix = (record === "admin" || record === "gift") ? record : "activated";
				await env.MEMORY_ORBS_USERS.put(normalized, `${prefix}_${Date.now()}`);
				return json({ valid: true });
			} catch (e) {
				return json({ valid: false, reason: "server_error" }, 500);
			}
		}

		// ──────────────────────────────────────────
		// POST /verify — 只读复验
		// ──────────────────────────────────────────
		if (url.pathname === "/verify") {
			try {
				const { email, code } = await request.json();
				const ne = normalizeEmail(email);
				const nc = normalizeCode(code);
				if (!ne || !nc) return json({ valid: false });

				const record = await env.MEMORY_ORBS_USERS.get(ne);
				if (!record) return json({ valid: false });

				const expected = await generateCode(ne, env.SECRET);
				return json({ valid: nc === expected });
			} catch {
				return json({ valid: false });
			}
		}

		// ──────────────────────────────────────────
		// POST /purchase — 已关闭
		// 当前采用支付宝收款码 + 人工核对收款 + 管理员手动授权。
		// 保留路由是为了让旧前端得到明确错误，而不是继续信任用户自报付款。
		// ──────────────────────────────────────────
		if (url.pathname === "/purchase") {
			return json({
				success: false,
				reason: "manual_review_required",
				message: "请扫码付款后联系管理员。管理员确认收款后会手动开通账号。",
			});
		}

		// ──────────────────────────────────────────
		// POST /register — 注册账号
		// ──────────────────────────────────────────
		if (url.pathname === "/register") {
			try {
				const { email, password } = await request.json();
				if (!email || !password || typeof email !== "string" || typeof password !== "string") {
					return json({ success: false, reason: "missing_fields" });
				}
				if (!email.includes("@")) {
					return json({ success: false, reason: "invalid_email" });
				}
				if (password.length < 6) {
					return json({ success: false, reason: "password_too_short" });
				}

				const normalized = normalizeEmail(email);
				const accountKey = "account:" + normalized;

				const existing = await env.MEMORY_ORBS_USERS.get(accountKey);
				if (existing) {
					return json({ success: false, reason: "email_already_registered" });
				}

				const passwordHash = await hashPassword(password, normalized, env.SECRET);
				await env.MEMORY_ORBS_USERS.put(
					accountKey,
					JSON.stringify({ password_hash: passwordHash, created_at: Date.now() })
				);

				return json({ success: true });
			} catch (e) {
				return json({ success: false, reason: "server_error" }, 500);
			}
		}

		// ──────────────────────────────────────────
		// POST /login — 登录获取 token
		// ──────────────────────────────────────────
		if (url.pathname === "/login") {
			try {
				const { email, password } = await request.json();
				if (!email || !password) {
					return json({ success: false, reason: "missing_fields" });
				}

				const normalized = normalizeEmail(email);
				const accountKey = "account:" + normalized;
				const accountRaw = await env.MEMORY_ORBS_USERS.get(accountKey);

				if (!accountRaw) {
					return json({ success: false, reason: "account_not_found" });
				}

				let account;
				try { account = JSON.parse(accountRaw); } catch {
					return json({ success: false, reason: "server_error" }, 500);
				}

				const hash = await hashPassword(password, normalized, env.SECRET);
				if (hash !== account.password_hash) {
					return json({ success: false, reason: "wrong_password" });
				}

				// 生成 session token（24h 有效期）
				const token = await generateToken(normalized, env.SECRET);
				await env.MEMORY_ORBS_USERS.put("session:" + token, normalized, {
					expirationTtl: 86400,
				});

				return json({ success: true, token, email: normalized });
			} catch (e) {
				return json({ success: false, reason: "server_error" }, 500);
			}
		}

		// ──────────────────────────────────────────
		// POST /my-keys — 查看我的激活码
		// ──────────────────────────────────────────
		if (url.pathname === "/my-keys") {
			try {
				const { token } = await request.json();
				if (!token) return json({ keys: [] });

				const email = await verifyToken(token, env);
				if (!email) return json({ keys: [] });

				// 检查是否有授权记录
				const record = await env.MEMORY_ORBS_USERS.get(email);
				if (!record) return json({ keys: [] });

				const code = await generateCode(email, env.SECRET);
				const status = record.includes("_") ? "activated" : "authorized";
				const type = record.startsWith("admin") ? "admin" : record.startsWith("gift") ? "gift" : "paid";

				return json({ keys: [{ code, status, email, type }] });
			} catch (e) {
				return json({ keys: [] });
			}
		}

		// ──────────────────────────────────────────
		// POST /stats — 管理员统计
		// ──────────────────────────────────────────
		if (url.pathname === "/stats") {
			try {
				const { token } = await request.json();
				if (!token || token !== env.ADMIN_TOKEN) {
					return new Response("unauthorized", { status: 401 });
				}

				const kv = env.MEMORY_ORBS_USERS;
				const expectedPrice = 24.9;
				let paid = 0, pending = 0, accounts = 0;
				let admin = 0, gift = 0, refunded = 0;
				const activatedUsers = [];
				const pendingUsers = [];
				const orders = [];
				const paymentIssues = [];
				const orderStats = {
					expectedPrice,
					total: 0,
					paid: 0,
					fulfilled: 0,
					refunded: 0,
					invalid: 0,
					discounted: 0,
					collectedAmount: 0,
					fulfilledAmount: 0,
					refundedAmount: 0,
				};

				function handleUserRecord(name, val) {
					if (!val) return;

					const type = val.startsWith("admin") ? "admin"
						: val.startsWith("gift") ? "gift"
						: "paid";

					const tsMatch = val.match(/_(\d+)$/);
					const ts = tsMatch ? parseInt(tsMatch[1], 10) : 0;
					const isActivated = val.startsWith("activated_") || val.startsWith("admin_") || val.startsWith("gift_");

					if (type === "admin") {
						admin++;
						if (isActivated) activatedUsers.push({ email: name, activatedAt: ts, type: "admin" });
						else pendingUsers.push({ email: name, type: "admin" });
					} else if (type === "gift") {
						gift++;
						if (isActivated) activatedUsers.push({ email: name, activatedAt: ts, type: "gift" });
						else pendingUsers.push({ email: name, type: "gift" });
					} else {
						if (isActivated) { paid++; activatedUsers.push({ email: name, activatedAt: ts, type: "paid" }); }
						else { pending++; pendingUsers.push({ email: name, type: "paid" }); }
					}
				}

				function handleOrderRecord(name, raw) {
					if (!raw) return;
					let order;
					try { order = JSON.parse(raw); } catch {
						orderStats.invalid++;
						paymentIssues.push({ id: name.replace(/^order:/, ""), issue: "bad_json" });
						return;
					}

					const id = String(order.id || name.replace(/^order:/, ""));
					const email = normalizeEmail(order.email);
					const amount = Number(order.amount);
					const expectedAmount = Number(order.expectedAmount || expectedPrice);
					const status = String(order.status || "paid");
					const paidAt = Number(order.paidAt || order.createdAt || 0);
					const fulfilledAt = Number(order.fulfilledAt || 0);
					const issue = !email ? "missing_email"
						: !Number.isFinite(amount) ? "bad_amount"
						: "";
					const priceNote = !issue && Number.isFinite(amount) && amount < expectedAmount ? "discount" : "";

					orderStats.total++;
					if (status === "refunded") {
						orderStats.refunded++;
						if (Number.isFinite(amount)) orderStats.refundedAmount += amount;
					} else if (status === "fulfilled") {
						orderStats.fulfilled++;
						if (Number.isFinite(amount)) {
							orderStats.collectedAmount += amount;
							orderStats.fulfilledAmount += amount;
						}
					} else {
						orderStats.paid++;
						if (Number.isFinite(amount)) orderStats.collectedAmount += amount;
					}

					if (issue) {
						orderStats.invalid++;
						paymentIssues.push({ id, email, amount, expectedAmount, status, issue });
					}
					if (priceNote === "discount") orderStats.discounted++;
					orders.push({ id, email, amount, expectedAmount, status, paidAt, fulfilledAt, issue, priceNote });
				}

				let cursor = undefined;
				do {
					const result = await kv.list({ cursor, limit: 1000 });
					cursor = result.cursor;
					const userKeys = [];
					const orderKeys = [];
					for (const key of result.keys) {
						const name = key.name;
						if (name.startsWith("session:")) continue;
						if (name.startsWith("account:")) { accounts++; continue; }
						if (name.startsWith("order:")) { orderKeys.push(name); continue; }
						if (name.startsWith("purchase:")) continue;
						if (name.startsWith("user_orders:")) continue;
						if (name.startsWith("refunded:")) { refunded++; continue; }
						if (!name.includes("@")) continue;
						userKeys.push(name);
					}
					for (let i = 0; i < userKeys.length; i += 50) {
						const chunk = userKeys.slice(i, i + 50);
						const values = await Promise.all(chunk.map((name) => kv.get(name)));
						for (let j = 0; j < chunk.length; j++) {
							handleUserRecord(chunk[j], values[j]);
						}
					}
					for (let i = 0; i < orderKeys.length; i += 50) {
						const chunk = orderKeys.slice(i, i + 50);
						const values = await Promise.all(chunk.map((name) => kv.get(name)));
						for (let j = 0; j < chunk.length; j++) {
							handleOrderRecord(chunk[j], values[j]);
						}
					}
				} while (cursor);

				activatedUsers.sort((a, b) => b.activatedAt - a.activatedAt);
				pendingUsers.sort((a, b) => a.email.localeCompare(b.email));
				orders.sort((a, b) => (b.paidAt || 0) - (a.paidAt || 0));

				return json({
					paid, pending, activated: paid, admin, gift, refunded,
					accounts,
					activatedUsers: activatedUsers.slice(0, 50),
					pendingUsers: pendingUsers.slice(0, 50),
					orders: orders.slice(0, 50),
					paymentIssues: paymentIssues.slice(0, 50),
					orderStats,
					totalActivatedUsers: activatedUsers.length,
					totalPendingUsers: pendingUsers.length,
					authorized: pending, total: paid + pending + admin + gift,
				});
			} catch (e) {
				return json({ error: "server_error" }, 500);
			}
		}

		return json({ error: "not_found" }, 404);
}
